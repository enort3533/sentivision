from typing import Optional
import logging

logger = logging.getLogger(__name__)


def _bbox_top_y(bbox: list) -> float:
    return min(pt[1] for pt in bbox)


def _bbox_bottom_y(bbox: list) -> float:
    return max(pt[1] for pt in bbox)


def _bbox_height(bbox: list) -> float:
    return _bbox_bottom_y(bbox) - _bbox_top_y(bbox)


def segment_comments(ocr_results: list[dict]) -> list[dict]:
    """
    Group OCR result lines into comment blocks by vertical proximity.
    Returns list of comment blocks: { lines, full_text, avg_confidence, bbox }
    """
    if not ocr_results:
        return []

    # Compute average line height
    heights = [_bbox_height(r["bbox"]) for r in ocr_results if r["bbox"]]
    avg_height = sum(heights) / len(heights) if heights else 20
    gap_threshold = avg_height * 2.0

    blocks = []
    current_block = [ocr_results[0]]

    for i in range(1, len(ocr_results)):
        prev = ocr_results[i - 1]
        curr = ocr_results[i]
        prev_bottom = _bbox_bottom_y(prev["bbox"])
        curr_top = _bbox_top_y(curr["bbox"])
        gap = curr_top - prev_bottom

        if gap <= gap_threshold:
            current_block.append(curr)
        else:
            blocks.append(current_block)
            current_block = [curr]
    blocks.append(current_block)

    result_blocks = []
    for idx, block in enumerate(blocks):
        lines = [r["text"] for r in block]
        full_text = " ".join(lines).strip()
        if len(full_text) < 3:
            continue
        avg_confidence = sum(r["confidence"] for r in block) / len(block)
        # Compute combined bounding box
        all_xs = [pt[0] for r in block for pt in r["bbox"]]
        all_ys = [pt[1] for r in block for pt in r["bbox"]]
        combined_bbox = [
            [min(all_xs), min(all_ys)],
            [max(all_xs), min(all_ys)],
            [max(all_xs), max(all_ys)],
            [min(all_xs), max(all_ys)],
        ]
        result_blocks.append({
            "block_id": idx,
            "lines": lines,
            "full_text": full_text,
            "avg_confidence": round(avg_confidence, 4),
            "bbox": combined_bbox,
        })
    return result_blocks
