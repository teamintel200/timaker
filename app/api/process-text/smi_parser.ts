/**
 * SMI (SAMI) 파일 파서
 * SMI 파일 문자열을 입력받아 자막 세그먼트 객체의 배열로 변환합니다.
 */

/**
 * 파싱된 자막 세그먼트의 구조를 정의하는 인터페이스입니다.
 */
export interface SmiSegment {
    startTime: number;      // 자막 시작 시간 (밀리초)
    endTime: number | null; // 자막 종료 시간 (밀리초), 다음 자막의 시작 시간이거나 마지막 자막인 경우 null
    duration: number | null;// 자막 지속 시간 (밀리초), endTime - startTime 이거나 마지막 자막인 경우 null
    text: string;           // 자막 텍스트 내용
  }
  
  /**
   * 파싱 과정에서 임시로 사용되는 SYNC 이벤트 구조입니다.
   */
  interface RawSyncEvent {
    startTime: number;
    rawHtmlContent: string; // <P> 태그 내부의 원본 HTML 내용
  }
  
  /**
   * HTML 문자열에서 특수 문자를 원래 문자로 변환하고, <br> 태그를 줄바꿈 문자로 변경하며,
   * 그 외 HTML 태그를 제거하고 양쪽 공백을 제거합니다.
   * @param html - 처리할 HTML 문자열
   * @returns 정리된 텍스트 문자열
   */
  function cleanSmiText(html: string): string {
    let text = html;
    // <br> 태그 (다양한 형태 포함)를 줄바꿈 문자로 변환
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // HTML 엔티티 변환
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&nbsp;/g, ' ');
    // 나머지 HTML 태그 제거 (간단한 방식)
    text = text.replace(/<[^>]+>/g, '');
    return text.trim(); // 양쪽 공백 제거
  }
  
  /**
   * SMI 파일 내용을 파싱하여 SmiSegment 객체의 배열로 반환합니다.
   * @param smiContent - 파싱할 SMI 파일의 전체 문자열 내용
   * @returns SmiSegment 객체의 배열
   */
  export function parseSmi(smiContent: string): SmiSegment[] {
    const segments: SmiSegment[] = [];
    const rawEvents: RawSyncEvent[] = [];
  
    // 1. <BODY> 태그 내부의 내용 추출
    const bodyMatch = smiContent.match(/<BODY>([\s\S]*?)<\/BODY>/i);
    if (!bodyMatch || bodyMatch.length < 2) {
      console.warn("SMI 파싱 경고: <BODY> 태그를 찾을 수 없거나 내용이 비어있습니다.");
      return [];
    }
    const bodyContent = bodyMatch[1];
  
    // 2. <SYNC Start=...> 태그와 그 내용을 찾는 정규표현식
    const syncRegex = new RegExp(/<SYNC Start=(\d+)(?:[^>]*)?>(?:\s*<P(?:[^>]*)?>)?(.*?)(?:<\/P>\s*)?<\/SYNC>/, "gis");
    // 설명:
    // <SYNC Start=(\d+)   : <SYNC Start= 와 숫자(startTime) 매칭 및 캡처
    // (?:[^>]*)?>         : SYNC 태그의 나머지 부분 (예: ID 속성) 매칭 (캡처 안 함)
    // (?:\s*<P(?:[^>]*)?>)? : 선택적으로 <P ...> 태그 매칭 (속성 및 공백 허용, 캡처 안 함)
    // (.*?)               : 내부 콘텐츠 (자막 텍스트) 캡처 (탐욕적이지 않게)
    // (?:<\/P>\s*)?       : 선택적으로 닫는 </P> 태그 및 공백 매칭 (캡처 안 함)
    // <\/SYNC>            : 닫는 </SYNC> 태그 매칭
    // gis                 : 전역(g), 대소문자 무시(i), 점(.)이 개행 문자도 포함(s)
  
    let match;
    while ((match = syncRegex.exec(bodyContent)) !== null) {
      const startTime = parseInt(match[1], 10);
      const rawHtmlContent = match[2] || ""; // <P> 태그 안의 내용, 또는 <P>가 없다면 <SYNC> 사이의 내용
  
      rawEvents.push({
        startTime,
        rawHtmlContent,
      });
    }
  
    if (rawEvents.length === 0) {
      console.warn("SMI 파싱 경고: <BODY> 내에서 <SYNC> 태그를 찾을 수 없습니다.");
      return [];
    }
  
    // 3. startTime을 기준으로 이벤트 정렬 (SMI 표준은 순서를 가정하지만, 안전을 위해)
    rawEvents.sort((a, b) => a.startTime - b.startTime);
  
    // 4. SmiSegment 객체 생성
    for (let i = 0; i < rawEvents.length; i++) {
      const currentEvent = rawEvents[i];
      const text = cleanSmiText(currentEvent.rawHtmlContent);
  
      let endTime: number | null = null;
      let duration: number | null = null;
  
      if (i + 1 < rawEvents.length) {
        // 다음 이벤트가 있다면, 그 시작 시간이 현재 이벤트의 종료 시간
        endTime = rawEvents[i + 1].startTime;
        duration = endTime - currentEvent.startTime;
      }
      // 마지막 이벤트의 경우 endTime과 duration은 null로 유지
  
      segments.push({
        startTime: currentEvent.startTime,
        endTime: endTime,
        duration: duration,
        text: text,
      });
    }
  
    return segments;
  }
  
  // // 예제 사용법 (테스트용)
  // /*
  // const exampleSmi = `
  // <SAMI>
  // <HEAD><TITLE>Test SMI</TITLE></HEAD>
  // <BODY>
  // <SYNC Start=1000><P Class=KRCC>첫 번째 자막입니다.</P></SYNC>
  // <SYNC Start=3000><P Class=KRCC>&nbsp;</P></SYNC>
  // <SYNC Start=4000><P Class=KRCC>두 번째 자막, <BR> 여러 줄 테스트.</P></SYNC>
  // <SYNC Start=7000><P Class=KRCC>세 번째 &amp; 마지막 자막.</P></SYNC>
  // <SYNC Start=10000><P Class=KRCC>&nbsp;</P></SYNC>
  // </BODY>
  // </SAMI>
  // `;
  // const parsedSegments = parseSmi(exampleSmi);
  // console.log(JSON.stringify(parsedSegments, null, 2));
  // */