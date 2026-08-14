/* ==========================================================================
   SoundPulse ID3 Tag & Audio Metadata Parser
   ========================================================================== */

export class TagParser {
  static async parseFile(file) {
    const defaultMeta = {
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Chưa rõ Ca sĩ",
      album: "Local Audio",
      duration: 0,
      coverUrl: null,
      format: file.name.split('.').pop().toUpperCase(),
      size: this.formatBytes(file.size),
      file: file
    };

    try {
      const buffer = await file.slice(0, 128 * 1024).arrayBuffer(); // Read first 128KB for ID3 header
      const view = new DataView(buffer);

      // Check ID3 header magic bytes "ID3" (0x49 0x44 0x33)
      if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
        const parsed = this.parseID3v2(view);
        return {
          ...defaultMeta,
          ...parsed
        };
      }
    } catch (e) {
      console.warn("Could not parse ID3 tags for", file.name, e);
    }

    return defaultMeta;
  }

  static parseID3v2(view) {
    const meta = {};
    const version = view.getUint8(3);
    const flags = view.getUint8(5);
    
    // Synchsafe integer conversion for ID3 header size
    const size = (view.getUint8(6) & 0x7F) << 21 |
                 (view.getUint8(7) & 0x7F) << 14 |
                 (view.getUint8(8) & 0x7F) << 7 |
                 (view.getUint8(9) & 0x7F);

    let offset = 10;
    const end = Math.min(offset + size, view.byteLength - 10);

    while (offset < end) {
      // Frame ID (4 bytes)
      let frameId = "";
      for (let i = 0; i < 4; i++) {
        const charCode = view.getUint8(offset + i);
        if (charCode >= 32 && charCode <= 126) {
          frameId += String.fromCharCode(charCode);
        }
      }

      if (frameId.length < 4) break;

      // Frame Size
      let frameSize;
      if (version === 4) {
        frameSize = (view.getUint8(offset + 4) & 0x7F) << 21 |
                    (view.getUint8(offset + 5) & 0x7F) << 14 |
                    (view.getUint8(offset + 6) & 0x7F) << 7 |
                    (view.getUint8(offset + 7) & 0x7F);
      } else {
        frameSize = view.getUint32(offset + 4, false);
      }

      if (frameSize <= 0 || offset + 10 + frameSize > view.byteLength) break;

      const frameDataOffset = offset + 10;

      if (frameId === "TIT2") { // Title
        meta.title = this.readTextFrame(view, frameDataOffset, frameSize);
      } else if (frameId === "TPE1") { // Artist
        meta.artist = this.readTextFrame(view, frameDataOffset, frameSize);
      } else if (frameId === "TALB") { // Album
        meta.album = this.readTextFrame(view, frameDataOffset, frameSize);
      } else if (frameId === "APIC") { // Attached Picture (Cover Art)
        const coverUrl = this.readAPICFrame(view, frameDataOffset, frameSize);
        if (coverUrl) meta.coverUrl = coverUrl;
      }

      offset += 10 + frameSize;
    }

    return meta;
  }

  static readTextFrame(view, offset, size) {
    if (size <= 1) return "";
    const encoding = view.getUint8(offset);
    let strBytes = new Uint8Array(view.buffer, offset + 1, size - 1);
    
    try {
      if (encoding === 0) { // ISO-8859-1
        return new TextDecoder("iso-8859-1").decode(strBytes).replace(/\0/g, "").trim();
      } else if (encoding === 1 || encoding === 2) { // UTF-16
        return new TextDecoder("utf-16").decode(strBytes).replace(/\0/g, "").trim();
      } else if (encoding === 3) { // UTF-8
        return new TextDecoder("utf-8").decode(strBytes).replace(/\0/g, "").trim();
      }
    } catch (e) {
      // Fallback ASCII
      return String.fromCharCode.apply(null, strBytes).replace(/\0/g, "").trim();
    }
    return "";
  }

  static readAPICFrame(view, offset, size) {
    try {
      const encoding = view.getUint8(offset);
      let current = offset + 1;

      // Read MIME type
      let mimeType = "";
      while (current < offset + size) {
        const b = view.getUint8(current++);
        if (b === 0) break;
        mimeType += String.fromCharCode(b);
      }
      if (!mimeType) mimeType = "image/jpeg";

      // Picture type (1 byte)
      current++;

      // Description (null terminated)
      while (current < offset + size) {
        const b = view.getUint8(current++);
        if (b === 0) break;
      }

      // Picture Data
      const imgDataLength = offset + size - current;
      if (imgDataLength > 0) {
        const imgArray = new Uint8Array(view.buffer, current, imgDataLength);
        const blob = new Blob([imgArray], { type: mimeType });
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.warn("Could not read APIC cover image", e);
    }
    return null;
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
