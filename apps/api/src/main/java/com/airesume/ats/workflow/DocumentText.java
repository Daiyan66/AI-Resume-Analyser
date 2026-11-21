package com.airesume.ats.workflow;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.Writer;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.zip.ZipInputStream;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class DocumentText {
    static final int MAX_FILE_BYTES = 2_000_000;
    private static final int MAX_TEXT = 20_000;

    private DocumentText() {}

    static String extract(String name, InputStream stream) throws IOException {
        byte[] bytes = stream.readNBytes(MAX_FILE_BYTES + 1);
        if (bytes.length == 0 || bytes.length > MAX_FILE_BYTES) {
            throw new IOException("Document exceeds extraction size limit.");
        }
        String filename = name.toLowerCase(Locale.ROOT);
        String text;
        if (filename.endsWith(".txt")) {
            text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
        } else if (filename.endsWith(".pdf")) {
            text = pdf(bytes);
        } else if (filename.endsWith(".docx")) {
            text = docx(bytes);
        } else {
            throw new IOException("Unsupported document type.");
        }
        text = text.strip();
        if (text.isEmpty() || text.indexOf('\0') >= 0) throw new IOException("No usable text found.");
        return text.substring(0, Math.min(MAX_TEXT, text.length()));
    }

    static String filename(String original) {
        String name = original == null ? "" : original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        if (name.isBlank() || name.length() > 255 || name.chars().anyMatch(Character::isISOControl)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a file with a valid name.");
        }
        return name;
    }

    private static String pdf(byte[] bytes) throws IOException {
        try (var document = Loader.loadPDF(bytes)) {
            if (document.isEncrypted()) throw new IOException("Encrypted PDF.");
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setEndPage(25);
            StringBuilder text = new StringBuilder();
            Writer limit = new Writer() {
                @Override public void write(char[] chars, int start, int length) {
                    text.append(chars, start, Math.min(length, MAX_TEXT - text.length()));
                }
                @Override public void flush() {}
                @Override public void close() {}
            };
            stripper.writeText(document, limit);
            return text.toString();
        }
    }

    private static String docx(byte[] bytes) throws IOException {
        try (var zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            var entry = zip.getNextEntry();
            int remaining = MAX_FILE_BYTES;
            for (int i = 0; entry != null && i < 100; i++) {
                byte[] part = zip.readNBytes(remaining + 1);
                remaining -= part.length;
                if (remaining < 0) throw new IOException("Expanded DOCX exceeds extraction size limit.");
                if ("word/document.xml".equals(entry.getName())) return xmlText(part);
                entry = zip.getNextEntry();
            }
        }
        throw new IOException("No DOCX document body.");
    }

    private static String xmlText(byte[] data) throws IOException {
        var factory = XMLInputFactory.newFactory();
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        try {
            var xml = factory.createXMLStreamReader(new ByteArrayInputStream(data));
            try {
                StringBuilder result = new StringBuilder();
                while (xml.hasNext() && result.length() < MAX_TEXT) {
                    int event = xml.next();
                    if (event == XMLStreamConstants.START_ELEMENT && "t".equals(xml.getLocalName())) {
                        result.append(xml.getElementText()).append(' ');
                    }
                    if (event == XMLStreamConstants.END_ELEMENT && "p".equals(xml.getLocalName())) result.append('\n');
                }
                return result.toString();
            } finally { xml.close(); }
        } catch (XMLStreamException ex) {
            throw new IOException("Unreadable DOCX text.", ex);
        }
    }
}
