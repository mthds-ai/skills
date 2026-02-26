# Native Content Types Reference

Each native concept maps to a content class with specific attributes. Understanding these attributes helps when:

- Writing `$var.field` references in prompts or PipeCompose templates
- Building `construct` blocks with `from = "input.field"`
- Interpreting pipeline outputs (e.g., what comes out of PipeExtract)
- Preparing input JSON for `mthds-agent pipelex run`

## Content Type Summary

| Native Concept | Content Class | Key Attributes |
|----------------|---------------|----------------|
| `Text` | TextContent | `text` |
| `Number` | NumberContent | `number` |
| `Image` | ImageContent | `url`, `filename`, `caption`, `mime_type`, `size` |
| `Document` | DocumentContent | `url`, `filename`, `mime_type` |
| `Html` | HtmlContent | `inner_html`, `css_class` |
| `TextAndImages` | TextAndImagesContent | `text` (TextContent), `images` (list of ImageContent) |
| `Page` | PageContent | `text_and_images` (TextAndImagesContent), `page_view` (ImageContent) |
| `JSON` | JSONContent | `json_obj` |
| `ImgGenPrompt` | *(refines Text)* | `text` |
| `Anything` | *(any content)* | depends on actual content |
| `Dynamic` | DynamicContent | user-defined fields |

## Detailed Attribute Reference

### Text — `TextContent`

| Attribute | Type | Description |
|-----------|------|-------------|
| `text` | `str` | The text content |

**Access**: `$var` or `$var.text` in prompts.

---

### Number — `NumberContent`

| Attribute | Type | Description |
|-----------|------|-------------|
| `number` | `int \| float` | The numeric value |

**Access**: `$var` or `$var.number` in prompts.

---

### Image — `ImageContent`

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | `str` | yes | Image location: storage URL, HTTP/HTTPS URL, or base64 data URL |
| `filename` | `str \| None` | no | Original filename (auto-populated from URL if not set) |
| `caption` | `str \| None` | no | Image caption or description |
| `mime_type` | `str \| None` | no | MIME type (e.g., `image/jpeg`, `image/png`) |
| `size` | `ImageSize \| None` | no | Pixel dimensions: `size.width` and `size.height` |
| `public_url` | `str \| None` | no | Public HTTPS URL for display |
| `source_prompt` | `str \| None` | no | The prompt used to generate this image (if AI-generated) |

**Access**: `$image.filename`, `$image.caption`, `$image.url` in prompts. Use `$image` alone in PipeLLM prompts for vision (image is sent to the LLM as a visual input).

---

### Document — `DocumentContent`

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | `str` | yes | Document location: storage URL, HTTP/HTTPS URL, or base64 data URL |
| `filename` | `str \| None` | no | Original filename (auto-populated from URL if not set) |
| `mime_type` | `str \| None` | no | MIME type (defaults to `application/pdf`) |
| `public_url` | `str \| None` | no | Public HTTPS URL for display |

**Access**: `$document.filename`, `$document.url` in prompts. Documents cannot be sent directly to LLMs — use PipeExtract first to get Page[] content.

---

### Html — `HtmlContent`

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `inner_html` | `str` | yes | The inner HTML content |
| `css_class` | `str` | yes | CSS class for the wrapping div |

**Access**: `$html.inner_html` in prompts.

---

### TextAndImages — `TextAndImagesContent`

Composite content holding text and associated images. Typically produced by PipeExtract.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | `TextContent \| None` | no | The text portion (has `.text` attribute) |
| `images` | `list[ImageContent] \| None` | no | List of images extracted alongside the text |

**Access**: `$var.text` gets the TextContent, `$var.images` gets the image list. When used with `@var` in a prompt, the text is auto-rendered.

---

### Page — `PageContent`

Represents a single page extracted from a document. Produced by PipeExtract when output is `Page[]`.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `text_and_images` | `TextAndImagesContent` | yes | The text and images extracted from the page |
| `page_view` | `ImageContent \| None` | no | Screenshot/visual render of the page |

**Access**: When `@page` is used in a PipeLLM prompt, the text content is auto-rendered and images are sent as visual inputs. `$page.text_and_images.text.text` drills to the raw text.

---

### JSON — `JSONContent`

| Attribute | Type | Description |
|-----------|------|-------------|
| `json_obj` | `dict[str, Any]` | The JSON object (must be a valid JSON-serializable dict) |

**Access**: `$var.json_obj` in prompts. Fields within the JSON object can be accessed with dot notation if the concept is structured.

---

### ListContent (multiplicity `[]`)

When a concept has `[]` multiplicity (e.g., `Page[]`, `Image[]`), the content is a `ListContent` wrapping a list of items:

| Attribute | Type | Description |
|-----------|------|-------------|
| `items` | `list[StuffContent]` | The list of content items |
| `nb_items` | `int` (property) | Number of items in the list |

ListContent supports iteration (`for item in list_content`), indexing (`list_content[0]`), and `len()`.

---

## Common Patterns

### PipeExtract output chain

PipeExtract produces `Page[]` — a list of pages. Each page contains `text_and_images` (text + images from OCR/extraction) and optionally `page_view` (a screenshot). To use extracted content in an LLM prompt:

```toml
# Extract pages from a document
[pipe.extract_pages]
type = "PipeExtract"
inputs = { document = "Document" }
output = "Page[]"

# Analyze the extracted pages — @pages auto-renders all page text
[pipe.analyze]
type = "PipeLLM"
inputs = { pages = "Page[]" }
output = "Analysis"
prompt = """
Analyze this document:

@pages
"""
```

### Accessing nested fields in PipeCompose

```toml
[pipe.build_summary.construct]
source_file = { from = "document.filename" }
image_count = { template = "$report.images" }
page_text = { from = "page.text_and_images.text.text" }
```

### Input JSON structure for each type

```json
{
  "my_text": {"concept": "native.Text", "content": {"text": "Hello"}},
  "my_number": {"concept": "native.Number", "content": {"number": 42}},
  "my_image": {"concept": "native.Image", "content": {"url": "/path/to/img.jpg", "mime_type": "image/jpeg"}},
  "my_document": {"concept": "native.Document", "content": {"url": "/path/to/doc.pdf"}},
  "my_json": {"concept": "native.JSON", "content": {"json_obj": {"key": "value"}}}
}
```
