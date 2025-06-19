import { NextResponse } from 'next/server';

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
    console.log('post processing')
    const formData = await request.formData();
    const files = formData.getAll('file');

    console.log(files)
    
    // 3. 가공된 데이터 리스트를 JSON 형태로 응답합니다.
    return NextResponse.json( { status: 200, url:'randomurl' });
  } catch (error) {
    // 요청 처리 중 오류 발생 시
    console.error('Route Handler 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 서버 오류가 발생했습니다.';
    return NextResponse.json({ error: `서버 내부 오류: ${errorMessage}` }, { status: 500 });
  }
}

// 다른 HTTP 메서드 (GET 등)에 대한 핸들러도 필요하다면 이곳에 추가합니다.
// export async function GET(request: Request) { ... }