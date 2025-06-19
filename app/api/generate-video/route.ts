// app/api/generate-video/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const segmentsPayloadString = formData.get('segmentsPayload') as string;

    if (!segmentsPayloadString) {
      return NextResponse.json({ error: 'Missing segmentsPayload' }, { status: 400 });
    }

    // 클라이언트가 보낸 segmentsPayload (JSON 문자열)
    // const parsedSegmentsPayload = JSON.parse(segmentsPayloadString);
    // console.log('Received segmentsPayload:', parsedSegmentsPayload);

    // 외부 API로 전달할 새로운 FormData 생성
    const externalApiFormData = new FormData();

    // 1. 세그먼트 메타데이터(JSON 문자열)를 그대로 전달
    externalApiFormData.append('segmentsPayload', segmentsPayloadString);

    // 2. 수신된 파일들을 새로운 FormData에 추가
    //    클라이언트에서 'file_INDEX' 형태로 파일을 보냈으므로, 해당 키들을 사용하거나
    //    formData.entries() 등을 통해 모든 파일 항목을 반복할 수 있습니다.
    //    여기서는 segmentsPayloadString을 파싱하여 imageFileKey를 참조해 파일을 가져옵니다.
    const clientSegmentsMetadata = JSON.parse(segmentsPayloadString);
    clientSegmentsMetadata.forEach((segmentMeta: any) => {
      if (segmentMeta.imageFileKey) { // 예: "file_0", "file_1"
        const file = formData.get(segmentMeta.imageFileKey) as File | null;
        if (file) {
          externalApiFormData.append(segmentMeta.imageFileKey, file, file.name);
          // console.log(`Appending file to external FormData: ${segmentMeta.imageFileKey}, ${file.name}`);
        }
      }
    });
    console.log(externalApiFormData);
    const externalApiUrl = process.env.API_URL; // 요청하신 외부 API 주소
    if (!externalApiUrl) {
        return NextResponse.json({ error: 'Missing externalApiUrl' }, { status: 400 });
    }
    console.log(`Forwarding FormData to external API: ${externalApiUrl}`);

    const externalApiResponse = await fetch(externalApiUrl, {
      method: 'POST',
      body: externalApiFormData, // FormData 전송 시 Content-Type 헤더는 fetch가 자동으로 설정
    });

    if (!externalApiResponse.ok) {
      const errorBody = await externalApiResponse.text(); // 외부 API의 에러 메시지를 그대로 전달 시도
      console.error(`External API error: ${externalApiResponse.status}`, errorBody);
      return NextResponse.json({ error: `External API request failed: ${externalApiResponse.status} - ${errorBody}` }, { status: externalApiResponse.status });
    }
    const responseData = await externalApiResponse.json(); 
    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Error in /api/generate-video:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}