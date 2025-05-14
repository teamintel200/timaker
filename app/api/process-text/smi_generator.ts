import * as fs from 'fs';
import { argv0 } from 'process';
// import * as path from 'path'; // Not strictly needed for this script but useful for path manipulation

// Define an interface for the function arguments
export interface CreateSmiParams {
    textStory: string;
    outputFilename?: string;
    charsPerLineLimit?: number;
    minDurationMs?: number;
    maxDurationMs?: number;
    msPerChar?: number;
    gapBetweenSyncsMs?: number;
    smiTitle?: string;
    cumulativeLinesLimit?: number;
}

// Define an interface for timed lines
export interface TimedLine {
    text: string;
    duration: number;
}

/**
 * Creates an SMI subtitle file from a long text story with appropriate timing.
 *
 * @param params - The parameters for generating the SMI file.
 * @param params.textStory - The input text story.
 * @param params.outputFilename - The name of the SMI file to be generated.
 * @param params.charsPerLineLimit - Max characters per line (including spaces).
 * @param params.minDurationMs - Minimum display time for a subtitle (ms).
 * @param params.maxDurationMs - Maximum display time for a subtitle (ms).
 * @param params.msPerChar - Time allocated per character for duration calculation (ms).
 * @param params.gapBetweenSyncsMs - Minimum gap between consecutive subtitles (ms).
 * @param params.smiTitle - Title for the SMI file's <TITLE> tag.
 * @param params.cumulativeLinesLimit - Max number of subtitle lines to display cumulatively.
 */
function createSmiFromStory({
    textStory,
    outputFilename = "subtitle.smi",
    charsPerLineLimit = 30,
    minDurationMs = 1500,
    maxDurationMs = 7000,
    msPerChar = 120,
    gapBetweenSyncsMs = 200,
    smiTitle = "Generated Subtitle",
    cumulativeLinesLimit = 4
}: CreateSmiParams): string {
    // 1. Split text into sentences (based on punctuation or newlines)
    // Punctuation is kept. trim() for leading/trailing whitespace.
    const sentences = textStory
        .trim()
        .split(/(?<=[.?!])\s+|\n+/g) // Regex to split after punctuation + space or by newline
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const timedLines: TimedLine[] = [];

    // 2. Further split long sentences based on chars_per_line_limit
    for (const sentence of sentences) {
        const words = sentence.split(/\s+/); // Split by any whitespace
        let currentLineText = "";
        for (const word of words) {
            if (!currentLineText) { // If current line is empty, add word
                currentLineText = word;
            } else if (currentLineText.length + 1 + word.length <= charsPerLineLimit) {
                // If adding word doesn't exceed limit, append it
                currentLineText += " " + word;
            } else {
                // Current line is full, finalize it
                if (currentLineText) { // Ensure currentLineText is not empty
                    const duration = Math.max(minDurationMs, Math.min(maxDurationMs, currentLineText.length * msPerChar));
                    timedLines.push({ text: currentLineText, duration });
                }
                currentLineText = word; // New line starts with the current word
            }
        }
        
        // Process the last remaining current_line_text for the sentence
        if (currentLineText) {
            const duration = Math.max(minDurationMs, Math.min(maxDurationMs, currentLineText.length * msPerChar));
            timedLines.push({ text: currentLineText, duration });
        }
    }

    if (timedLines.length === 0) {
        console.warn(`Warning: No content to convert to subtitles for '${outputFilename}'.`);
        // To create an empty SMI file with basic structure, you could uncomment the following:
        /*
        const smiContentHeader = `<SAMI>
    <HEAD>
    <TITLE>${smiTitle}</TITLE>
    <STYLE TYPE="text/css">
    </STYLE>
    </HEAD>
    <BODY>
    </BODY>
    </SAMI>`;
        try {
            fs.writeFileSync(outputFilename, smiContentHeader, { encoding: 'utf-8' });
        } catch (e: any) {
            console.error(`Error writing empty SMI file: ${e.message}`);
        }
        */
        return "";
    }

    // 3. Generate SMI file content
    let smiContent = `<SAMI>
<HEAD>
<TITLE>${smiTitle}</TITLE>
<STYLE TYPE="text/css">
/* Add any default styles here, e.g., for KRCC class */
/* P { font-family: Arial, sans-serif; font-size: 18pt; text-align: center; } */
/* .KRCC { Name: Korean; lang: ko-KR; SAMIType: CC; } */
</STYLE>
</HEAD>
<BODY>
`;
    let currentTimeMs = gapBetweenSyncsMs; // Initial gap before the first subtitle

    // Array to manage cumulative lines (acts like the Python deque for this use case)
    let visibleLinesArray: string[] = [];

    for (let i = 0; i < timedLines.length; i++) {
        const lineInfo = timedLines[i];
        
        // Escape HTML special characters for the new line
        const newLineEscaped = lineInfo.text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // If visibleLinesArray reaches cumulativeLinesLimit, clear it before adding the new line
        if (visibleLinesArray.length === cumulativeLinesLimit) {
            visibleLinesArray = []; // Clear the array
        }
        
        visibleLinesArray.push(newLineEscaped);
        
        const textToDisplay = visibleLinesArray.join("<br>");
        const duration = lineInfo.duration;
        
        const startTime = currentTimeMs;
        const endTime = startTime + duration;
        
        smiContent += `<SYNC Start=${startTime}><P Class=KRCC>${textToDisplay}</P></SYNC>\n`;
        
        let clearTime: number;
        if (i < timedLines.length - 1) { // If not the last subtitle
            const nextSyncExpectedStart = endTime + gapBetweenSyncsMs;
            
            const offset = gapBetweenSyncsMs > 1 ? Math.floor(gapBetweenSyncsMs / 2) : 1;
            clearTime = Math.max(endTime + 1, nextSyncExpectedStart - offset);
            
            if (clearTime >= nextSyncExpectedStart) {
                clearTime = nextSyncExpectedStart - 1;
            }
            if (clearTime <= endTime) { // Ensure clear_time is strictly after end_time
                clearTime = endTime + 1;
            }
        } else { // Last subtitle
            clearTime = endTime + 1; // Clear right after it ends (or after gapBetweenSyncsMs)
        }
        
        // Ensure clearTime is actually after startTime, can happen if duration is very small.
        // And ensure clearTime is greater than endTime.
        if (clearTime <= startTime) clearTime = startTime + 1; // Should not happen with current logic but good guard.
        if (clearTime <= endTime) clearTime = endTime + 1;


        smiContent += `<SYNC Start=${clearTime}><P Class=KRCC>&nbsp;</P></SYNC> \n`;
        
        currentTimeMs = endTime + gapBetweenSyncsMs; // Update time for the next subtitle
    }

    smiContent += `</BODY>
</SAMI>
`;

    // 4. Save SMI file
    // Node.js fs.writeFileSync defaults to 'utf-8'.
    // For CP949 (often used for SMI in Korea), you might need a library like 'iconv-lite'
    // if native Node.js support for 'euc-kr' (alias for CP949) is insufficient or problematic.
    // try {
    //     fs.writeFileSync(outputFilename, smiContent, { encoding: 'utf-8' });
    //     console.log(`SMI file '${outputFilename}' created successfully with UTF-8 encoding.`);
    // } catch (e: any) {
    //     console.error(`Error writing SMI file to '${outputFilename}' with UTF-8: ${e.message}`);
    //     // The Python script attempts CP949 as a fallback.
    //     // In Node.js, direct CP949 might require iconv-lite for full character support.
    //     // Example with iconv-lite (npm install iconv-lite):
    //     /*
    //     try {
    //         const iconv = require('iconv-lite');
    //         const buffer = iconv.encode(smiContent, 'cp949');
    //         fs.writeFileSync(outputFilename, buffer);
    //         console.log(`SMI file '${outputFilename}' created successfully with CP949 encoding using iconv-lite.`);
    //     } catch (e2: any) {
    //         console.error(`Error writing SMI file with CP949 encoding using iconv-lite: ${e2.message}`);
    //     }
    //     */
    //    // As a simpler fallback (though not ideal for Korean):

    //    return smiContent;
    //     // try {
    //     //     fs.writeFileSync(outputFilename, smiContent, { encoding: 'latin1' }); // 'latin1' will likely corrupt Korean characters
    //     //     console.log(`SMI file '${outputFilename}' created with latin1 encoding (UTF-8 failed, Korean characters may be corrupted).`);
    //     // } catch (e2: any) {
    //     //     console.error(`Error writing SMI file with fallback latin1 encoding: ${e2.message}`);
    //     // }
    // }

    return smiContent
}

// --- Main execution block (equivalent to Python's if __name__ == '__main__':) ---
async function main(longTextExample:string):Promise<string> {

    const outputSmiFile = "output_ts.smi"; // Using a different name to avoid overwriting python's output
    
    return createSmiFromStory({
        textStory: longTextExample,
        outputFilename: outputSmiFile,
        charsPerLineLimit: 28,
        msPerChar: 120,
        minDurationMs: 1200,
        maxDurationMs: 6000,
        gapBetweenSyncsMs: 150,
        cumulativeLinesLimit: 4 // Default is 4 lines cumulative
    });
}

// Run the main function if the script is executed directly
if (require.main === module) {
    main(argv0).catch(error => {
        console.error("An error occurred in the main execution:", error);
    });
}

// To make this a module that can be imported elsewhere:
export default { createSmiFromStory };
