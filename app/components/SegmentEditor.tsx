// components/SegmentEditor.tsx
'use client'; // 이 컴포넌트는 클라이언트 컴포넌트임을 명시

import React, { useState, ChangeEvent } from 'react';

interface SegmentEditorProps {
  segmentText: string;
  initialImageUrl?: string; // 초기 이미지 URL (있다면)
  onImageUrlChange: (newUrl: string) => void; // 이미지 URL 변경 시 호출될 콜백
}

const SegmentEditor: React.FC<SegmentEditorProps> = ({
  segmentText,
  initialImageUrl = '',
  onImageUrlChange,
}) => {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);

  const handleImageUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setImageUrl(newUrl);
    onImageUrlChange(newUrl); // 부모 컴포넌트로 변경 사항 알림
  };

  return (
    <div style={{
      border: '1px solid #ccc',
      padding: '15px',
      margin: '15px 0',
      borderRadius: '5px',
      backgroundColor: '#f9f9f9'
    }}>
      {/* 텍스트 구간 표시 */}
      <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>
        {segmentText || "(빈 줄)"}
      </p>

      {/* 이미지 입력 필드 */}
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor={`image-url-${segmentText.slice(0, 10)}-${Math.random().toString(16).slice(2, 8)}`}>이미지 URL:</label> {/* 고유 ID 생성 */}
        <input
          type="text"
          value={imageUrl}
          onChange={handleImageUrlChange}
          placeholder="여기에 이미지 URL을 입력하세요"
          style={{ width: 'calc(100% - 100px)', marginLeft: '10px', padding: '5px' }}
        />
      </div>

      {/* 이미지 미리 보기 */}
      {imageUrl && (
        <div style={{ marginTop: '10px' }}>
          <img
            src={imageUrl}
            alt="Segment preview"
            style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain' }}
            onError={(e) => {
              // 이미지 로드 실패 시 대체 텍스트나 아이콘 표시
              e.currentTarget.onerror = null; // 무한 루프 방지
              e.currentTarget.src = 'https://via.placeholder.com/150?text=Image+Load+Error'; // 대체 이미지
            }}
          />
        </div>
      )}

      {/* TODO: 나중에 추가될 기능 - 이미지 업로드 버튼, 이미지 검색 버튼, 구간 시간 설정 등 */}
    </div>
  );
};

export default SegmentEditor;