import os
import json
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from datetime import datetime
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()


def save_report(result, output_dir: str | None = None) -> str:
    """Save evaluation report to timestamped directory. Returns directory path."""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    if output_dir is None:
        output_dir = str(Path(__file__).parent.parent / "reports" / f"evaluation_{ts}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # 1. metrics.json
    metrics = {
        "dataset_size": result.dataset_size,
        "valid_samples": result.valid_samples,
        "skipped_samples": result.skipped_samples,
        "accuracy": result.accuracy,
        "precision": result.precision,
        "recall": result.recall,
        "macro_f1": result.macro_f1,
        "weighted_f1": result.weighted_f1,
        "labels": result.labels,
        "timestamp": ts,
    }
    with open(os.path.join(output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    # 2. classification_report.txt
    with open(os.path.join(output_dir, "classification_report.txt"), "w") as f:
        f.write(result.classification_report)

    # 3. confusion_matrix.png
    cm_array = np.array(result.confusion_matrix)
    fig, ax = plt.subplots(figsize=(7, 5))
    sns.heatmap(
        cm_array,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=result.labels,
        yticklabels=result.labels,
        ax=ax,
    )
    ax.set_title("Confusion Matrix", fontsize=14, fontweight="bold")
    ax.set_xlabel("Predicted", fontsize=12)
    ax.set_ylabel("Actual", fontsize=12)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "confusion_matrix.png"), dpi=150)
    plt.close()

    # 4. predictions.csv
    if not result.predictions_df.empty:
        result.predictions_df.to_csv(os.path.join(output_dir, "predictions.csv"), index=False)

    # 5. misclassified_samples.csv
    if not result.misclassified_df.empty:
        result.misclassified_df.to_csv(os.path.join(output_dir, "misclassified_samples.csv"), index=False)

    # 6. evaluation_summary.txt
    summary = f"""SENTIVISION EVALUATION SUMMARY
{'='*50}
Timestamp:        {ts}
Dataset Size:     {result.dataset_size:,}
Valid Samples:    {result.valid_samples:,}
Skipped Samples:  {result.skipped_samples:,}
{'='*50}
Accuracy:         {result.accuracy*100:.2f}%
Precision:        {result.precision*100:.2f}%
Recall:           {result.recall*100:.2f}%
Macro F1:         {result.macro_f1*100:.2f}%
Weighted F1:      {result.weighted_f1*100:.2f}%
{'='*50}
Classification Report:
{result.classification_report}
"""
    with open(os.path.join(output_dir, "evaluation_summary.txt"), "w") as f:
        f.write(summary)

    return output_dir


def print_evaluation_results(result) -> None:
    """Print evaluation results to terminal using Rich."""
    console.print()
    console.print(Panel.fit(
        "[bold blue]SENTIVISION EVALUATION[/bold blue]",
        border_style="blue",
    ))
    console.print()

    table = Table(box=box.ROUNDED, show_header=False, border_style="blue")
    table.add_column("Metric", style="bold cyan", width=20)
    table.add_column("Value", style="bold white")

    table.add_row("Dataset Size", f"{result.dataset_size:,}")
    table.add_row("Valid Samples", f"{result.valid_samples:,}")
    table.add_row("Skipped Samples", f"{result.skipped_samples:,}")
    table.add_row("─" * 18, "─" * 20)
    table.add_row("Accuracy", f"[green]{result.accuracy*100:.2f}%[/green]")
    table.add_row("Precision", f"{result.precision*100:.2f}%")
    table.add_row("Recall", f"{result.recall*100:.2f}%")
    table.add_row("Macro F1", f"[bold yellow]{result.macro_f1*100:.2f}%[/bold yellow]")
    table.add_row("Weighted F1", f"{result.weighted_f1*100:.2f}%")

    console.print(table)
    console.print()
    console.print("[bold]Classification Report:[/bold]")
    console.print(result.classification_report)
