"use client";

import { useState } from 'react';

// API 응답 항목의 타입을 정의합니다.
// route.ts의 ProcessedDataItem과 일치해야 합니다.
interface ProcessedItem {
  startTime: string;
  endTime: string;
  duration: string;
  text: string;
}

export default function Home() {
  const [inputText, setInputText] = useState<string>("");
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text.");
      setProcessedItems([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessedItems([]); // 이전 결과 초기화

    try {
      const response = await fetch('/api/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data: ProcessedItem[] = await response.json();
      setProcessedItems(data);

    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred.");
      }
      setProcessedItems([]); // 오류 발생 시 결과 초기화
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-row items-center px-24 space-x-12">
      <div className="flex w-1/3 flex-col items-center justify-center space-y-4 h-full">
        <textarea
          placeholder="Enter text"
          className="w-full h-[70vh] border border-black rounded-md p-2"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
        />
        <button
          className="border border-black rounded-md px-4 py-2 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Submit"}
        </button>
      </div>
      <div className="w-[1px] h-[100vh] bg-black"></div>
      <div className="flex w-2/3 flex-col h-full space-y-20">
        <div className="flex h-1/2 w-full items-center justify-center">
          <div className="w-[100px] h-[100px] bg-black"></div>
        </div>
        <div className="w-full h-[1px] bg-black"></div>
        <div className="flex h-1/2 w-full overflow-x-auto overflow-y-auto space-x-2">
          {isLoading && <p className="text-gray-500">Loading results...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!isLoading && !error && processedItems.length === 0 && inputText && (
            <p className="text-gray-500">No segments found for the input.</p>
          )}
          {!isLoading && !error && processedItems.length === 0 && !inputText && (
            <p className="text-gray-500">Enter text and click submit to see results.</p>
          )}
          {processedItems.map((item, index) => (
            <div
              key={`${item.startTime}-${index}`} // 고유한 key 생성
              className="w-[150px] h-[150px] bg-gray-200 rounded-md shrink-0 p-2 flex items-center justify-center text-center overflow-hidden"
              title={`Start: ${new Date(item.startTime).toLocaleTimeString()}\nEnd: ${new Date(item.endTime).toLocaleTimeString()}`}
            >
              <span className="text-xs break-all">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
