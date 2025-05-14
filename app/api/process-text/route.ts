import { NextResponse } from 'next/server';
import smiGenerator from './smi_generator'; // smi_generator.ts에서 default export 가져오기
import { parseSmi, SmiSegment } from './smi_parser';   // smi_parser.ts에서 named export 가져오기

// 응답 데이터 항목의 타입을 정의합니다.
interface ProcessedDataItem {
  startTime: string; // Date 객체를 ISO 문자열로 변환하여 전송합니다.
  endTime: string;
  duration: string;
  text: string;
}

// POST 요청을 처리하는 비동기 함수를 export 합니다.
export async function POST(request: Request) {
  try {
    // 1. 요청 본문에서 JSON 데이터를 읽습니다.
    // 클라이언트에서 { text: "사용자가 입력한 텍스트" } 형태로 보낼 것으로 가정합니다.
    const { text: inputText } = await request.json();

    // 입력 데이터 유효성 검사 (간단하게 문자열인지 확인)
    if (typeof inputText !== 'string' || inputText.trim() === '') {
      return NextResponse.json({ error: '유효하지 않거나 텍스트가 비어있습니다.' }, { status: 400 });
    }

    console.log(`서버에서 수신한 텍스트: "${inputText}"`);

    // 2. 입력 텍스트 처리 과정 변경
    // 2.1. smi_generator를 사용하여 inputText로부터 SMI 문자열 생성
    // smiGenerator.createSmiFromStory 함수를 사용합니다.
    // 필요한 경우 createSmiFromStory의 옵션을 여기에 맞게 조정할 수 있습니다.
    const smiString = smiGenerator.createSmiFromStory({
      textStory: inputText,
      // 예시: 기본값 대신 특정 옵션 사용
      // charsPerLineLimit: 35,
      // msPerChar: 110,
      // minDurationMs: 1000,
      // maxDurationMs: 5000,
      // gapBetweenSyncsMs: 150,
      // cumulativeLinesLimit: 2
    });

    console.log(`생성된 SMI 문자열 (일부): \n${smiString.substring(0, 500)}...`); // 디버깅을 위해 SMI 문자열 일부 로깅

    // 2.2. 생성된 SMI 문자열을 smi_parser로 파싱
    const parsedSegments: SmiSegment[] = parseSmi(smiString);
    console.log(`파싱된 세그먼트 수 (필터링 전): ${parsedSegments.length}`);

    // 2.3. 파싱된 결과를 ProcessedDataItem 형태로 변환
    //      - smi_generator가 생성하는 &nbsp; 등 빈 자막이나,
    //      - endTime이 null인 세그먼트는 실제 콘텐츠가 아니므로 필터링합니다.
    const processedData: ProcessedDataItem[] = parsedSegments
      .filter(segment => segment.endTime !== null && segment.text.trim() !== '')
      .map(segment => ({
        startTime: new Date(segment.startTime).toISOString(),
        // 위 filter에서 segment.endTime이 null이 아님을 보장하므로 타입 단언 사용
        endTime: new Date(segment.endTime as number).toISOString(),
        duration: segment.duration?.toString() || '0',
        text: segment.text,
      }));

    // 3. 가공된 데이터 리스트를 JSON 형태로 응답합니다.
    console.log(`최종 반환될 데이터 항목 수: ${processedData.length}`);
    return NextResponse.json(processedData, { status: 200 });
  } catch (error) {
    // 요청 처리 중 오류 발생 시
    console.error('Route Handler 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 서버 오류가 발생했습니다.';
    return NextResponse.json({ error: `서버 내부 오류: ${errorMessage}` }, { status: 500 });
  }
}

// 다른 HTTP 메서드 (GET 등)에 대한 핸들러도 필요하다면 이곳에 추가합니다.
// export async function GET(request: Request) { ... }