package com.airesume.ats.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

class DocumentTextTest {
    @Test
    void readsPdfText() throws Exception {
        var bytes = new ByteArrayOutputStream();
        try (var pdf = new PDDocument()) {
            var page = new PDPage();
            pdf.addPage(page);
            try (var stream = new PDPageContentStream(pdf, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText("Spring services");
                stream.endText();
            }
            pdf.save(bytes);
        }
        assertThat(DocumentText.extract("proof.pdf", new ByteArrayInputStream(bytes.toByteArray()))).isEqualTo("Spring services");
    }

    @Test
    void extractsDocxTextAndRejectsOversizedExpandedContent() throws Exception {
        String envelope = "<w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'>" +
                "<w:body><w:p><w:r><w:t>%s</w:t></w:r></w:p></w:body></w:document>";
        assertThat(DocumentText.extract("proof.docx", docx(envelope.formatted("Spring services")))).isEqualTo("Spring services");
        assertThatThrownBy(() -> DocumentText.extract("proof.docx", docx(envelope.formatted("a".repeat(2_000_001)))))
                .isInstanceOf(java.io.IOException.class);
    }

    private static ByteArrayInputStream docx(String text) throws Exception {
        var bytes = new ByteArrayOutputStream();
        try (var zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(text.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return new ByteArrayInputStream(bytes.toByteArray());
    }
}
