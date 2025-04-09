import FileSaver from 'file-saver'
import JSZip from 'jszip'
import { v4 as uuid } from 'uuid'
import { QRCodeParams } from './qrcode'
import { Chapter } from './totp'


const getMetadataContainer = () =>
  `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
  <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
</rootfiles>
</container>`

const getStyle = () =>
  `h1 {
  text-align: left;
  font-size: 1.5em;
}`

const getOpfContent = (title: string, chapters: Chapter[]) =>
  `<?xml version="1.0" encoding="UTF-8" ?>
<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" unique-identifier="db-id" version="3.0">
<metadata>
  <dc:title id="t1">${title}</dc:title>
  <dc:creator id="author">Luca Mattiazzi</dc:creator>
  <dc:description>1 month of Authenticator values</dc:description>
  <dc:identifier id="db-id">${uuid()}</dc:identifier>
  <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  <dc:language>en</dc:language>
</metadata>
<manifest>
  <item id="toc" properties="nav" href="toc.xhtml" media-type="application/xhtml+xml" />
  <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
  <item id="template_css" href="template.css" media-type="text/css" />
  ${chapters.map((c) => `<item id="${c.title}" href="${c.title}.xhtml" media-type="application/xhtml+xml" />`).join('\n')}
</manifest>
<spine toc="ncx">
  ${chapters.map((c) => `<itemref idref="${c.title}" />`).join('\n')}
</spine>
</package>
`

const getXHTMLContent = (chapter: Chapter) =>
  `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${chapter.title}</title>
  <link href="style.css" rel="stylesheet" type="text/css" />
</head>
<body>${chapter.content}</body>
</html>
`

const getTocNcx = (title: string, chapters: Chapter[]) =>
  `<?xml version="1.0" encoding="UTF-8" ?>
<ncx version="2005-1" xml:lang="en" xmlns="http://www.daisy.org/z3986/2005/ncx/">
<head>
    <meta name="dtb:uid" content="isbn"/>
    <meta name="dtb:depth" content="1"/>
</head>
<docTitle>
    <text>${title}</text>
</docTitle>
<navMap>
    <navPoint id="content.x" playOrder="1">
        <navLabel><text>cover</text></navLabel>
        ${chapters.map((c) => `<content src="${c.title}.xhtml" />`).join('\n')}
    </navPoint>
</navMap>
</ncx>
`

const getTocXHTML = (chapters: Chapter[]) =>
  `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">

<head>
  <title>toc.xhtml</title>
  <link href="style.css" rel="stylesheet" type="text/css" />
</head>

<body>

  <nav id="toc" epub:type="toc">
    <h1 class="frontmatter">Table of Contents</h1>
    <ol class="contents">
      ${chapters.map((c) => `<li><a href="${c.title}.xhtml">${c.title}</a></li>`).join('\n')}
    </ol>

  </nav>

</body>

</html>`

export async function generateBook(
  params: QRCodeParams,
  chapters: Chapter[],
): Promise<void> {
  const zip = new JSZip
  const contentFolder = zip.folder('OEBPS')!
  const metaFolder = zip.folder('META-INF')!
  const title = `1 month of TOTPs for ${params.issuer} from ${new Date().toISOString().slice(0, 10)}`
  zip.file('mimetype', 'application/epub+zip')
  metaFolder.file('container.xml', getMetadataContainer())
  contentFolder.file('style.css', getStyle())
  contentFolder.file('content.opf', getOpfContent(title, chapters))
  chapters.forEach((chapter) => {
    contentFolder.file(`${chapter.title}.xhtml`, getXHTMLContent(chapter))
  })
  contentFolder.file('toc.ncx', getTocNcx(title, chapters))
  contentFolder.file('toc.xhtml', getTocXHTML(chapters))
  const file = await zip.generateAsync({ type: 'blob' })
  FileSaver.saveAs(file, 'authenticator.epub')
}

