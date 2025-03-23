//=======================================================
// Function to split text into chunks with support for Japanese
function splitIntoChunksBase(text, maxChunkSize = 500)
{
  const chunks = [];

  // Japanese uses different punctuation marks for sentence endings
  // Regular expression that handles both English and Japanese sentence boundaries
  // Japanese sentence endings:
  // 。 (U+3002) - Japanese full stop/period
  // ！ (U+FF01) - Japanese exclamation mark
  // ？ (U+FF1F) - Japanese question mark
  // Also handles English punctuation (.!?)
  const sentenceRegex = /(?<=[.!?。！？])\s*/g;

  const sentences = text.split(sentenceRegex).filter(s => s.trim().length > 0);

  let currentChunk = "";
  for (const sentence of sentences) {
    // If adding this sentence would exceed maxChunkSize and we already have content
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }

    // If a single sentence is longer than maxChunkSize, we need to split it further
    // This is especially important for Japanese which might not use spaces between words
    if (sentence.length > maxChunkSize) {
      // Add the current chunk if it's not empty
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // Split long sentence by character count
      let remainingSentence = sentence;
      while (remainingSentence.length > 0) {
        const chunkText = remainingSentence.substring(0, maxChunkSize);
        chunks.push(chunkText.trim());
        remainingSentence = remainingSentence.substring(maxChunkSize);
      }
    } else {
      currentChunk += sentence + " ";
    }
  }

  // Add the last chunk if there's remaining content
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

//=======================================================
// Optional: Add a language detection function to optimize chunking based on language
function detectLanguage(text)
{
  // Simple detection of Japanese characters using Unicode ranges:
  // \u3000-\u303f - Japanese punctuation and symbols
  // \u3040-\u309f - Hiragana characters
  // \u30a0-\u30ff - Katakana characters
  // \uff00-\uff9f - Full-width Roman characters and half-width Katakana
  // \u4e00-\u9faf - Kanji (Common and uncommon Chinese characters used in Japanese)
  const japanesePattern = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/;
  return japanesePattern.test(text) ? 'ja' : 'en';
}

//=======================================================
// Enhanced chunking function that uses language detection
function splitIntoChunks(text, maxChunkSize = 500)
{
  const language = detectLanguage(text);

  if (language === 'ja') {
    // For Japanese text, we might want to adjust chunking parameters
    // Japanese characters may carry more meaning in fewer characters
    return splitIntoChunksBase(text, maxChunkSize);
  } else {
    // For English or other languages
    return splitIntoChunksBase(text, maxChunkSize);
  }
}

module.exports = { splitIntoChunks };
