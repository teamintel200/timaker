// app/page.tsx
'use client'; // 이 페이지 컴포넌트는 클라이언트 컴포넌트임을 명시
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import SegmentEditor from './components/SegmentEditor'; // SegmentEditor 컴포넌트 임포트
// import '../app/globals.css'; // 필요에 따라 전역 스타일 시트 임포트

// 각 구간의 데이터를 저장할 인터페이스
interface SegmentData {
  id: number; // 고유 ID (키 관리에 용이)
  text: string;
  imageUrl: string; // Can store local object URLs for preview or server URLs
  duration?: number; // 구간 표시 시간 (선택 사항)
  imageFile: File | undefined;
  speed?: string; // 음성 빠르기 (예: 'slow', 'normal', 'fast')
  voice?: 'male' | 'female'; // 음성 종류
}

const HomePage: React.FC = () => {
  const [storyText, setStoryText] = useState<string>('');
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false); // 동영상 생성 중 상태
  // 새로 추가: 현재 선택된 구간의 ID
  const [globalBackgroundImageUrl, setGlobalBackgroundImageUrl] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  // const [videoResultUrl, setVideoResultUrl] = useState<string | null>(null); // 동영상 결과 URL 상태 (필요 시 사용)


  // 텍스트 입력 변경 핸들러
  const handleStoryTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setStoryText(e.target.value);
  };

  // '구간 분리' 버튼 클릭 핸들러
  const handleSegmentStory = () => {
    if (!storyText.trim()) {
      setSegments([]);
      setSelectedSegmentId(null); // 새로운 분리 시 선택 상태 초기화
      // setVideoResultUrl(null); // 새로운 분리 시 결과 초기화
      return;
    }

    // 줄 바꿈 기준으로 텍스트 분리
    const lines = storyText.split('\n');

    // 분리된 줄들을 SegmentData 객체 배열로 변환
    const newSegments: SegmentData[] = lines
      .map((line, index) => ({ // 빈 줄도 포함하여 처리 (원치 않으면 filter로 제거)
        id: index, // 간단한 ID 사용 (고유성 보장 위해 다른 방법 고려 가능)
        text: line.trim(), // 앞뒤 공백 제거
        imageUrl: '', // 초기 이미지 URL은 비워둡니다.
        duration: 5, // 기본 표시 시간 (예: 5초)
        imageFile: undefined,
        speed: 'normal', // 기본 음성 빠르기
        voice: undefined, // 기본 음성 종류 (예: 여성)
      }))
      .filter(segment => segment.text !== ''); // 완전히 빈 줄은 제거 (선택 사항)


    setSegments(newSegments);
    setSelectedSegmentId(newSegments.length > 0 ? newSegments[0].id : null); // 분리 후 첫 번째 구간 자동 선택
    // setVideoResultUrl(null); // 새로운 분리 시 결과 초기화
  };

  // 음성 빠르기 변경 핸들러
  const handleSpeechSpeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newSpeed = e.target.value;
    if (selectedSegmentId !== null) {
      setSegments(prevSegments =>
        prevSegments.map(segment =>
          segment.id === selectedSegmentId ? { ...segment, speed: newSpeed } : segment
        )
      );
    }
  };

  // 음성 종류 변경 핸들러
  const handleVoiceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVoice = e.target.value as 'male' | 'female';
    if (selectedSegmentId !== null) {
      setSegments(prevSegments =>
        prevSegments.map(segment =>
          segment.id === selectedSegmentId ? { ...segment, voice: newVoice } : segment
        )
      );
    }
  };

  // SegmentEditor 컴포넌트에서 이미지 URL 변경 시 호출될 핸들러 (선택된 구간 ID 사용)
  const handleSegmentImageUrlChange = (id: number, newUrl: string) => {
    setSegments(prevSegments =>
      prevSegments.map(segment =>
        segment.id === id ? { ...segment, imageUrl: newUrl } : segment
      )
    );
  };

  // 구간 목록에서 특정 구간 클릭 시 호출될 핸들러
  const handleSelectSegment = (id: number) => {
    setSelectedSegmentId(id);
  };

  // '동영상 생성' 버튼 클릭 핸들러
  const handleGenerateVideo = async () => {
    if (segments.length === 0) {
      alert('먼저 이야기를 입력하고 구간을 분리해주세요.');
      return;
    }

    // 유효성 검사: 모든 구간에 이미지가 지정되었는지? (선택 사항)
    // const allImagesAssigned = segments.every(segment => segment.text === '' || (segment.imageUrl && segment.imageUrl.trim() !== '')); // 빈 텍스트 구간은 이미지 필수가 아닐 수 있음
    // if (!allImagesAssigned) {
    //   alert('모든 구간에 이미지를 지정해야 합니다.');
    //   return;
    // }

    setIsGenerating(true); // 생성 시작 상태로 변경

    console.log('동영상 생성을 위해 서버로 전송할 데이터:', segments);

    const formData = new FormData();

    // 1. 세그먼트 메타데이터 준비 (File 객체 자체는 JSON으로 직렬화되지 않으므로 제외하거나 파일명 등으로 대체)
    const segmentsPayload = segments.map((segment, index) => {
      const { imageFile, ...restOfSegment } = segment;
      return {
        ...restOfSegment,
        // 서버에서 파일을 참조할 수 있도록 파일 키 또는 파일명 정보를 포함할 수 있습니다.
        // 여기서는 파일이 FormData에 'file_INDEX' 형태로 추가될 것을 명시합니다.
        imageFileKey: imageFile ? `file_${index}` : undefined,
        originalImageFileName: imageFile ? imageFile.name : undefined,
      };
    });
    formData.append('segmentsPayload', JSON.stringify(segmentsPayload));

    // 2. 실제 이미지 파일들을 FormData에 추가
    segments.forEach((segment, index) => {
      if (segment.imageFile) {
        formData.append(`file_${index}`, segment.imageFile, segment.imageFile.name);
      }
    });

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        body: formData, // FormData를 body로 사용, Content-Type 헤더는 브라우저가 자동으로 설정
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json(); // 외부 API로부터 받은 결과
      console.log('동영상 생성 결과:', result);
      alert('동영상 생성 요청 성공! (결과 확인은 콘솔)');
      // TODO: 외부 API 응답(result)을 바탕으로 videoResultUrl 등을 설정할 수 있습니다.
      // 예: if (result.videoUrl) setVideoResultUrl(result.videoUrl);

    } catch (error: any) {
      console.error('동영상 생성 요청 중 오류 발생:', error);
      alert(`동영상 생성 요청 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsGenerating(false); // 생성 완료 또는 오류 시 상태 해제
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const globalBgInputRef = useRef<HTMLInputElement>(null);

  // Handler for when a file is selected
  const handleImageFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Get the first selected file

    // Always clear the file input's value to allow selecting the same file again
    if (!file) {
      event.target.value = '';
    }

    if (!file) {
      console.log("No file selected.");
      return;
    }

    if (selectedSegmentId === null) {
      alert("배경 이미지를 설정할 구간을 먼저 선택해주세요.");
      return;
    }

    // Create an object URL for the selected file to use as a local preview
    const newObjectUrl = URL.createObjectURL(file);

    setSegments(prevSegments =>
      prevSegments.map(segment => {
        if (segment.id === selectedSegmentId) {
          // If there was a previous object URL for this segment, revoke it to free memory
          if (segment.imageUrl && segment.imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(segment.imageUrl);
          }
          // Update the segment with the new topic image URL and file
          return { ...segment, imageUrl: newObjectUrl, imageFile: file };
        }
        return segment;
      })
    );

    console.log(`Topic image selected: ${file.name}. Preview URL created: ${newObjectUrl}`);
  };

  // Handler for global background image selection
  const handleGlobalBackgroundImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) { // Clear input value to allow re-selection of the same file
      event.target.value = '';
    }

    if (file) {
      if (globalBackgroundImageUrl && globalBackgroundImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(globalBackgroundImageUrl);
      }
      const newObjectUrl = URL.createObjectURL(file);
      setGlobalBackgroundImageUrl(newObjectUrl);
      console.log(`Global background image selected: ${file.name}. Preview URL: ${newObjectUrl}`);
    } else {
      console.log("No global background image selected.");
    }
  };

  // Function to trigger the hidden file input for topic images
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  // Function to trigger the hidden file input for global background
  const triggerGlobalBgUpload = () => {
    globalBgInputRef.current?.click();
  };

  // 현재 선택된 구간 찾기
  const selectedSegment = segments.find(segment => segment.id === selectedSegmentId);

  // Effect for cleaning up any remaining object URLs when the component unmounts
  useEffect(() => {
    return () => {
      segments.forEach(segment => {
        if (segment.imageUrl && segment.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(segment.imageUrl);
          console.log(`Revoked object URL on unmount: ${segment.imageUrl}`);
        }
      });
      if (globalBackgroundImageUrl && globalBackgroundImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(globalBackgroundImageUrl);
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount


  return (
    // 메인 컨테이너: 화면 전체 높이를 차지하고 내부를 Flexbox로 2분할
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif' }}>

      {/* 왼쪽 영역: 이야기 입력 및 제어 */}
      <div style={{
        flex: 1, // 사용 가능한 공간의 1/3 차지 (대략)
        padding: '20px',
        borderRight: '1px solid #eee', // 구분선
        overflowY: 'auto', // 내용 넘칠 시 스크롤
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>이야기 입력</h1>

        <textarea
          value={storyText}
          onChange={handleStoryTextChange}
          placeholder="짧은 이야기를 여기에 입력하세요. 줄 바꿈으로 구간을 나눌 수 있습니다."
          rows={10}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            flexGrow: 1, // 남은 세로 공간 채우기
            marginBottom: '15px'
          }}
        />
        <button
          onClick={handleSegmentStory}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            width: '100%', // 버튼 너비 100%
            marginBottom: '20px'
          }}
        >
          이야기 구간 분리
        </button>

        {/* 전체 배경 이미지 업로드 버튼 */}
        <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>전체 배경 설정</h2>
          <input
            type="file"
            accept="image/*"
            ref={globalBgInputRef}
            onChange={handleGlobalBackgroundImageSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={triggerGlobalBgUpload}
            style={{
              padding: '10px 15px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: '#6c757d', // A different color
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              width: '100%',
            }}
          >
            전체 배경 이미지 업로드
          </button>
          {globalBackgroundImageUrl && <img src={globalBackgroundImageUrl} alt="Global Background Preview" style={{maxWidth: '100%', maxHeight: '100px', objectFit: 'cover', marginTop: '10px', borderRadius: '4px'}}/>}
        </div>

        {/* 동영상 생성 버튼 영역 (좌측 하단에 배치) */}
        {segments.length > 0 && (
          <div style={{
            marginTop: 'auto', // 왼쪽 영역 하단에 배치
            paddingTop: '20px',
            borderTop: '1px solid #eee', // 구분선
            textAlign: 'center'
          }}>
            <h2>동영상 생성</h2>
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating} // 생성 중에는 버튼 비활성화
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                backgroundColor: isGenerating ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                marginBottom: '10px'
              }}
            >
              {isGenerating ? '생성 중...' : '동영상 생성 요청'}
            </button>
            {isGenerating && <p style={{ color: '#555' }}>서버에서 동영상을 만들고 있습니다. 잠시만 기다려 주세요.</p>}
            {/* TODO: 생성 완료 후 동영상 결과 표시 */}
            {/* {videoResultUrl && (
                  <div style={{marginTop: '20px'}}>
                    <p>동영상 생성 완료!</p>
                    <video src={videoResultUrl} controls width="100%"></video>
                    <a href={videoResultUrl} download>다운로드</a>
                  </div>
                )} */}
          </div>
        )}
      </div>

      {/* 오른쪽 영역: 상단 편집 / 하단 목록 */}
      <div style={{
        flex: 2, // 사용 가능한 공간의 2/3 차지 (대략)
        display: 'flex',
        flexDirection: 'column', // 내부 요소를 세로로 배치
        overflowY: 'hidden' // 스크롤은 내부 자식에서 처리
      }}>

        {/* 오른쪽 상단: 선택된 구간 편집 */}
        {/* Right Pane: 상단 편집 / 하단 목록 */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: '400px' }}>

          {/* Right Top Pane: 선택된 구간 편집 - Modified UI */}
          <div style={{
            //flex: 1, // Take remaining vertical space
            padding: '20px',
            borderBottom: '1px solid #eee',
            display: 'flex', // Use flex to center the vertical frame + button container
            flexDirection: 'column', // Stack elements vertically within this pane
            alignItems: 'center', // Align direct children (like the frame+panel container) to the right
            justifyContent: 'flex-start', // Align contents to the top
            position: 'relative', // Needed for absolute positioning of the button container
            overflowY: 'auto', // Add scroll if content in this pane exceeds height
            overflowX: 'hidden'
          }}>
            <h2 style={{ fontSize: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', width: '100%', textAlign: 'center' }}>선택된 구간 편집</h2>

            {selectedSegment ? (
              // Container for Frame and Settings Panel
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start', // Align items to the start of the cross axis (top for row). Use 'center' for vertical centering.
                width: 'auto', // Adjust width to content, allowing parent's alignItems: 'center' to horizontally center this container.
                gap: '20px', // Space between frame and settings panel
              }}>
                {/* Vertical Video Frame */}
                <div style={{
                  width: '220px', // Fixed width (adjust as needed)
                  height: '400px', // Fixed height (adjust as needed, maintains vertical aspect)
                  border: '1px solid #ccc',
                  borderRadius: '10px',
                  backgroundColor: globalBackgroundImageUrl ? '#000' : '#f0f0f0', // If global bg, use dark, else placeholder
                  position: 'relative', // Needed for absolute positioning of text overlay
                  overflow: 'hidden', // Hide content outside frame
                  // Use global background image if available
                  backgroundImage: globalBackgroundImageUrl ? `url('${globalBackgroundImageUrl}')` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center', // Center the image
                  backgroundRepeat: 'no-repeat',
                  display: 'flex',
                  flexDirection: 'column', // Stack items vertically inside frame
                  justifyContent: 'flex-end', // Align text to the bottom
                  padding: '15px', // Padding inside the frame for text
                  boxSizing: 'border-box', // Include padding in dimensions
                  flexShrink: 0, // Prevent frame from shrinking
                }}>
                  {/* Topic Image (selectedSegment.imageUrl) - centered overlay */}
                  {selectedSegment.imageUrl && (
                    <img
                      src={selectedSegment.imageUrl}
                      alt="Topic Image"
                      style={{
                        position: 'absolute',
                        top: '55px', // 55px 여백 (상단)
                        left: '0',   // 프레임 왼쪽에 정렬
                        width: '100%', // 프레임 폭 전체를 채움 (220px)
                        height: 'calc(100% - 120px)', // 프레임 높이(400px) - 상단(55px) - 하단(65px) = 280px
                        objectFit: 'cover', // 지정된 영역을 채우도록 이미지 크기 조정 (필요시 잘림)
                        zIndex: 1, // Above background, below text
                        // transform: 'none', // 이전 transform 제거 (필요 시 명시적 설정)
                        borderRadius: '4px',
                      }}
                    />
                  )}
                  {/* Segment Text inside the frame (at the bottom) */}
                  {selectedSegment.text && (
                    <p style={{
                      color: '#fff', // White text
                      fontSize: '18px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      margin: 0,
                      textShadow: '1px 1px 3px rgba(0,0,0,0.8)', // Text shadow for readability
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 5, // Limit lines
                      WebkitBoxOrient: 'vertical',
                      textOverflow: 'ellipsis',
                      position: 'relative', // Ensure text is above topic image if they overlap
                      zIndex: 2,
                    }}>
                      {selectedSegment.text}
                    </p>
                  )}
                </div>

                {/* NEW Settings Panel */}
                <div style={{
                  // flex: 1, // Allow panel to grow if needed
                  minWidth: '230px', // Give some width to the panel
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px', // Space between elements in the panel
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '0px', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px', textAlign:'center' }}>세부 설정</h3>
                  
                  {/* Hidden File Input (moved here, logically close to its trigger) */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageFileSelect}
                    style={{ display: 'none' }}
                  />
                  {/* Image Upload Button (moved here) */}
                  <button
                    onClick={triggerFileUpload}
                    style={{
                      padding: '10px 15px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: '#f0ad4e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      boxShadow: '1px 1px 3px rgba(0,0,0,0.1)',
                      width: '100%',
                    }}
                  >
                    토픽 이미지 업로드
                  </button>

                  {/* Speech Speed Radio Buttons */}
                  <div>
                    <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px' }}>음성 빠르기</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {['slow', 'normal', 'fast'].map(speedValue => (
                        <label key={speedValue} style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="radio"
                            name="speechSpeed"
                            value={speedValue}
                            checked={(selectedSegment?.speed || 'normal') === speedValue}
                            onChange={handleSpeechSpeedChange}
                            style={{ marginRight: '8px' }}
                          />
                          {speedValue === 'slow' ? '느리게' : speedValue === 'normal' ? '보통' : '빠르게'}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Voice Selection Radio Buttons */}
                  <div>
                    <h4 style={{ marginTop: '0', marginBottom: '10px', fontSize: '14px' }}>목소리 선택</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {['female', 'male'].map(voiceValue => (
                        <label key={voiceValue} style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="radio"
                            name="voiceSelection"
                            value={voiceValue}
                            checked={(selectedSegment?.voice || 'female') === voiceValue}
                            onChange={handleVoiceChange}
                            style={{ marginRight: '8px' }}
                          />
                          {voiceValue === 'female' ? '여자 목소리' : '남자 목소리'}
                        </label>
                      ))}
                    </div>
                  </div>

                </div> {/* End of NEW Settings Panel */}
              </div> // End of container for frame and settings panel

            ) : (
              <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>아래 '분리된 구간 목록'에서 구간을 클릭하여 편집하세요.</p>
            )}
          </div>
        </div>

        {/* 오른쪽 하단: 분리된 구간 목록 - 가로 스크롤 사각형 형태로 변경 */}
        {/* 컨테이너 자체는 패딩과 높이를 가짐 */}
        <div style={{
          flex: 1,
          flexShrink: 0, // 부모가 공간이 부족해도 이 영역이 줄어들지 않도록 함
          height: '180px', // 이 영역의 고정된 높이 설정
          padding: '20px',
          borderTop: '1px solid #eee', // 상단 구분선
          display: 'flex', // 내부 아이템(제목, 목록)을 세로로 배치
          flexDirection: 'column',
          overflow: 'hidden' // 자식에서 스크롤 처리
        }}>
          <h2 style={{ fontSize: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>분리된 구간 목록</h2>

          {segments.length > 0 ? (
            // 가로 스크롤을 위한 Flex 컨테이너
            <div style={{
              display: 'flex', // 아이템들을 가로로 배치
              overflowX: 'auto', // 가로 스크롤 활성화
              overflowY: 'hidden', // 세로 스크롤 비활성화
              whiteSpace: 'nowrap', // 아이템들이 줄 바꿈되지 않도록 함
              paddingBottom: '15px', // 스크롤바 때문에 잘리는 부분 방지
              height: 'calc(100% - 55px)', // 제목 및 패딩 높이 제외
              boxSizing: 'border-box' // 패딩 포함 높이 계산
            }}>
              {segments.map(segment => (
                // 각 구간 항목을 나타내는 사각형 div
                <div
                  key={segment.id}
                  onClick={() => handleSelectSegment(segment.id)} // 클릭 시 선택 상태 변경
                  style={{
                    flexShrink: 0, // 공간이 부족해도 이 사각형이 줄어들지 않도록 함 (가로 스크롤 핵심)
                    width: '150px', // 사각형의 너비 고정
                    height: '100%', // 컨테이너 높이에 맞춤
                    border: `2px solid ${selectedSegmentId === segment.id ? '#0070f3' : '#eee'}`, // 선택 시 테두리 강조
                    backgroundColor: selectedSegmentId === segment.id ? '#e6f7ff' : '#fff', // 선택 시 배경색 변경
                    padding: '12px',
                    marginRight: '15px', // 사각형 간 간격
                    borderRadius: '8px', // 모서리 둥글게
                    cursor: 'pointer', // 마우스 오버 시 커서 변경
                    transition: 'border-color 0.2s ease, background-color 0.2s ease', // 부드러운 전환 효과
                    boxShadow: selectedSegmentId === segment.id ? '0 0 8px rgba(0, 112, 243, 0.4)' : 'none', // 선택 시 그림자 효과
                    display: 'flex', // 내부 콘텐츠(텍스트, 이미지) 세로 배치
                    flexDirection: 'column',
                    justifyContent: 'space-between', // 텍스트와 이미지 간 간격 조절
                    whiteSpace: 'normal', // 텍스트는 사각형 내에서 줄 바꿈 허용
                    overflow: 'hidden', // 넘치는 내용 숨김
                  }}
                >
                  {/* 구간 텍스트 표시 (여러 줄 표시 및 넘침 처리) */}
                  <p style={{
                    fontWeight: selectedSegmentId === segment.id ? 'bold' : 'normal',
                    margin: 0,
                    fontSize: '13px',
                    lineHeight: '1.4',
                    // 텍스트 여러 줄 자르기 (Webkit 기반 브라우저에서 잘 작동)
                    display: '-webkit-box',
                    WebkitLineClamp: 4, // 텍스트를 최대 4줄로 제한
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis', // 잘린 끝에 ... 표시
                    flexGrow: 1 // 텍스트 영역이 남은 공간을 채우도록 함
                  }}>
                    {segment.text || "(빈 줄)"}
                  </p>
                  {/* 이미지 URL이 있으면 작은 미리 보기 표시 */}
                  {segment.imageUrl && (
                    <img
                      src={segment.imageUrl}
                      alt="thumbnail"
                      style={{ width: '40px', height: '40px', objectFit: 'cover', marginTop: '8px', borderRadius: '4px', alignSelf: 'flex-end', border: '1px solid #eee' }} // 오른쪽 하단에 배치
                      onError={(e) => {
                        // 이미지 로드 실패 시 이미지를 숨김
                        e.currentTarget.style.display = 'none';
                        // 또는 e.currentTarget.src = 'placeholder-error-icon.png'; // 대체 이미지 사용
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>이야기를 입력하고 '이야기 구간 분리' 버튼을 눌러 분리된 구간 목록을 확인하세요.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default HomePage;
