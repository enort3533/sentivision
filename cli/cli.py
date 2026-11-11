#!/usr/bin/env python3
"""SENTIVISION CLI — Sentiment Analysis Command-Line Interface"""

import sys
import os
from pathlib import Path
from typing import Optional
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box
import pandas as pd

# Allow importing from backend and cli
_project_root = Path(__file__).parent.parent
_backend_dir = _project_root / "backend"
_cli_dir = _project_root / "cli"
sys.path.insert(0, str(_backend_dir))
sys.path.insert(0, str(_cli_dir))
sys.path.insert(0, str(_project_root))

app = typer.Typer(name="sentivision", help="SENTIVISION — Image-Based Sentiment Intelligence CLI")
console = Console()


@app.command()
def predict(
    text: Optional[str] = typer.Option(None, "--text", help="Single text to analyze"),
    input_file: Optional[Path] = typer.Option(None, "--input", help="CSV file to process"),
    text_column: str = typer.Option("text", "--text-column", help="Column containing text"),
    output: Optional[Path] = typer.Option(None, "--output", help="Output CSV file"),
    label_map: Optional[str] = typer.Option(
        None, "--label-map", help="e.g. 0=negative,1=neutral,2=positive"
    ),
):
    """Predict sentiment for a single text or a CSV file."""
    from predictor import get_model

    model = get_model()

    if text:
        result = model.predict(text)
        console.print()
        console.print(Panel.fit("[bold blue]SENTIVISION — SENTIMENT PREDICTION[/bold blue]", border_style="blue"))
        console.print()
        console.print(f"[bold]Input:[/bold] {result['text']}")
        console.print()
        sentiment_color = {"positive": "green", "negative": "red", "neutral": "yellow"}.get(
            result["sentiment"], "white"
        )
        console.print(
            f"[bold]Predicted Sentiment:[/bold] [{sentiment_color}]{result['sentiment'].upper()}[/{sentiment_color}]"
        )
        console.print(f"[bold]Confidence:[/bold] {result['confidence']*100:.1f}%")
        console.print()
        console.print("[bold]Class Probabilities:[/bold]")
        for label, prob in result["probabilities"].items():
            color = {"positive": "green", "negative": "red", "neutral": "yellow"}.get(label, "white")
            bar = "█" * int(prob * 20)
            console.print(f"  [{color}]{label.capitalize():12}[/{color}] {prob*100:5.1f}%  {bar}")
        console.print()

    elif input_file:
        if not input_file.exists():
            console.print(f"[red]File not found: {input_file}[/red]")
            raise typer.Exit(1)
        df = pd.read_csv(input_file)
        if text_column not in df.columns:
            console.print(f"[red]Column '{text_column}' not found. Available: {list(df.columns)}[/red]")
            raise typer.Exit(1)

        df[text_column] = df[text_column].fillna("").astype(str).str.strip()
        texts = df[text_column].tolist()

        console.print(f"[blue]Processing {len(texts)} rows...[/blue]")
        from rich.progress import Progress, SpinnerColumn, TextColumn

        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
            task = progress.add_task("Predicting...", total=None)
            predictions = model.predict_batch(texts)
            progress.update(task, completed=True)

        df["predicted_sentiment"] = [p["sentiment"] for p in predictions]
        df["confidence"] = [p["confidence"] for p in predictions]
        df["prob_negative"] = [p["probabilities"].get("negative", 0.0) for p in predictions]
        df["prob_neutral"] = [p["probabilities"].get("neutral", 0.0) for p in predictions]
        df["prob_positive"] = [p["probabilities"].get("positive", 0.0) for p in predictions]

        out_path = output or input_file.parent / (input_file.stem + "_predictions.csv")
        df.to_csv(out_path, index=False)
        console.print(f"[green]✓ Predictions saved to {out_path}[/green]")

        # Summary
        counts = df["predicted_sentiment"].value_counts()
        table = Table(title="Prediction Summary", box=box.ROUNDED)
        table.add_column("Sentiment", style="bold")
        table.add_column("Count")
        table.add_column("Percentage")
        for label in ["positive", "negative", "neutral"]:
            cnt = counts.get(label, 0)
            color = {"positive": "green", "negative": "red", "neutral": "yellow"}[label]
            table.add_row(
                f"[{color}]{label.capitalize()}[/{color}]",
                str(cnt),
                f"{cnt/len(df)*100:.1f}%",
            )
        console.print(table)
    else:
        console.print("[red]Provide --text or --input[/red]")
        raise typer.Exit(1)


@app.command()
def evaluate(
    input_file: Path = typer.Option(..., "--input", help="Labelled CSV file"),
    text_column: str = typer.Option("text", "--text-column"),
    label_column: str = typer.Option("sentiment", "--label-column"),
    label_map: Optional[str] = typer.Option(
        None, "--label-map", help="e.g. 0=negative,1=neutral,2=positive"
    ),
    output_dir: Optional[Path] = typer.Option(None, "--output-dir", help="Output directory for report"),
):
    """Evaluate model on a labelled dataset and generate a full report."""
    from evaluator import evaluate as run_evaluate
    from report_generator import save_report, print_evaluation_results

    if not input_file.exists():
        console.print(f"[red]File not found: {input_file}[/red]")
        raise typer.Exit(1)

    df = pd.read_csv(input_file)
    console.print(f"[blue]Loaded {len(df):,} rows from {input_file.name}[/blue]")

    result = run_evaluate(df, text_column, label_column, label_map)
    print_evaluation_results(result)

    out = save_report(result, str(output_dir) if output_dir else None)
    console.print(f"[green]✓ Report saved to: {out}[/green]")


@app.command(name="download-dataset")
def download_dataset(
    source: str = typer.Option("tweet_eval", "--source", help="Dataset name (e.g. tweet_eval)"),
    split: str = typer.Option("test", "--split", help="Dataset split"),
    config: Optional[str] = typer.Option(None, "--config", help="Dataset config (e.g. sentiment)"),
    output_dir: Optional[Path] = typer.Option(None, "--output-dir", help="Output directory"),
):
    """Download a public labelled dataset from Hugging Face."""
    from dataset_downloader import download_dataset as dl

    dl(source, split, config, str(output_dir) if output_dir else None)


if __name__ == "__main__":
    app()
