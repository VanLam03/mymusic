/* ==========================================================================
   SoundPulse LRC Synchronized Lyrics Parser
   ========================================================================== */

export class LyricsParser {
  static parseLRC(lrcText) {
    if (!lrcText) return [];

    const lines = lrcText.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    lines.forEach(line => {
      timeRegex.lastIndex = 0;
      const matches = [...line.matchAll(timeRegex)];

      if (matches.length > 0) {
        const text = line.replace(timeRegex, '').trim();
        if (text) {
          matches.forEach(match => {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
            const totalSeconds = minutes * 60 + seconds + ms / 1000;

            result.push({
              time: totalSeconds,
              text: text
            });
          });
        }
      }
    });

    // Sort lyrics chronologically
    return result.sort((a, b) => a.time - b.time);
  }

  static getActiveLineIndex(lyricsArray, currentTime) {
    if (!lyricsArray || lyricsArray.length === 0) return -1;
    for (let i = lyricsArray.length - 1; i >= 0; i--) {
      if (currentTime >= lyricsArray[i].time) {
        return i;
      }
    }
    return 0;
  }
}
