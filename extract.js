const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const pdfPath = path.resolve(__dirname, "TeamViewer13.pdf");

(async () => {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const pagesXml = [];
  const scale = 2;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // 1. 이미지 렌더링
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;

    const imgOut = fs.createWriteStream(`page${pageNum}.png`);
    const stream = canvas.createPNGStream();
    stream.pipe(imgOut);

    // 2. 텍스트 추출
    const textContent = await page.getTextContent();
    const itemsXml = textContent.items.map((item) => {
      const [a, b, c, d, x, y] = item.transform;
      const width = item.width * scale;
      const height = item.height * scale;
      const finalX = x * scale;
      const finalY = y * scale;
      return `<text value="${escapeXml(item.str)}" x="${finalX.toFixed(
        2
      )}" y="${finalY.toFixed(2)}" width="${width.toFixed(
        2
      )}" height="${height.toFixed(2)}" font="${item.fontName}" />`;
    });

    pagesXml.push(
      `<page number="${pageNum}" width="${viewport.width}" height="${
        viewport.height
      }">\n  ${itemsXml.join("\n  ")}\n</page>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n  ${pagesXml.join(
    "\n  "
  )}\n</document>`;
  fs.writeFileSync("output.xml", xml, "utf-8");
  console.log("XML 및 이미지 추출 완료");
})();

function escapeXml(str) {
  return str.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      }[c])
  );
}
