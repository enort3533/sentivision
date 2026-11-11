import os
import json
import sys
from datetime import datetime
from pathlib import Path
from rich.console import Console
from rich.progress import Progress

console = Console()

SUPPORTED_DATASETS = {
    "tweet_eval": {
        "config": "sentiment",
        "splits": ["train", "test", "validation"],
        "label_map": {0: "negative", 1: "neutral", 2: "positive"},
        "text_col": "text",
        "label_col": "label",
        "license": "CC BY 4.0 (see https://huggingface.co/datasets/tweet_eval)",
    },
    "sst2": {
        "config": None,
        "splits": ["train", "validation"],
        "label_map": {0: "negative", 1: "positive"},
        "text_col": "sentence",
        "label_col": "label",
        "license": "See https://huggingface.co/datasets/sst2",
        "note": "Binary dataset (pos/neg only). Neutral class will be absent.",
    },
}


def download_dataset(
    source: str,
    split: str = "test",
    config: str | None = None,
    output_dir: str | None = None,
) -> str:
    """Download dataset from Hugging Face and save as CSV. Returns output CSV path."""
    try:
        from datasets import load_dataset
    except ImportError:
        console.print("[red]Error: 'datasets' library not installed. Run: pip install datasets[/red]")
        sys.exit(1)

    if source not in SUPPORTED_DATASETS:
        console.print(
            f"[red]Unsupported dataset: {source}. Supported: {list(SUPPORTED_DATASETS.keys())}[/red]"
        )
        sys.exit(1)

    info = SUPPORTED_DATASETS[source]
    if config is None:
        config = info.get("config")

    console.print(f"[bold blue]Downloading {source} ({split}) from Hugging Face...[/bold blue]")

    if config:
        dataset = load_dataset(source, config, split=split, trust_remote_code=True)
    else:
        dataset = load_dataset(source, split=split, trust_remote_code=True)

    text_col = info["text_col"]
    label_col = info["label_col"]
    label_map = info["label_map"]

    import pandas as pd

    df = dataset.to_pandas()

    if text_col not in df.columns or label_col not in df.columns:
        available = list(df.columns)
        console.print(
            f"[red]Expected columns '{text_col}', '{label_col}'. Found: {available}[/red]"
        )
        sys.exit(1)

    output_df = pd.DataFrame({
        "text": df[text_col].astype(str).str.strip(),
        "sentiment": df[label_col].map(label_map),
    })
    output_df = output_df.dropna()
    output_df = output_df[output_df["text"].str.len() > 0]

    if output_dir is None:
        output_dir = str(Path(__file__).parent.parent / "data" / "datasets")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    csv_name = f"{source}_{split}.csv"
    csv_path = os.path.join(output_dir, csv_name)
    output_df.to_csv(csv_path, index=False)

    # Metadata
    meta = {
        "dataset_name": source,
        "config": config,
        "source": f"https://huggingface.co/datasets/{source}",
        "split": split,
        "num_samples": len(output_df),
        "label_mapping": {str(k): v for k, v in label_map.items()},
        "download_date": datetime.now().isoformat(),
        "license": info.get("license", "Unknown"),
        "columns": ["text", "sentiment"],
        "note": info.get("note", ""),
    }
    meta_path = csv_path.replace(".csv", "_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    console.print(f"[green]✓ Saved {len(output_df):,} samples to {csv_path}[/green]")
    console.print(f"[green]✓ Metadata saved to {meta_path}[/green]")
    return csv_path
