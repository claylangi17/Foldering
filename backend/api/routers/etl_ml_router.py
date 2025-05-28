from etl.etl_script import main_etl_process
from ml.training_pipeline import run_folder_generation_pipeline  # Changed function name
from ml.inference import classify_item_by_parsing  # Changed function name
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
# Assuming NewItemClassificationResponse is defined in classification_schemas
# from ..schemas.classification_schemas import NewItemClassificationResponse # Commenting out for now
import sys
import os

# Add the parent directory of 'etl' to sys.path to allow sibling imports
# This assumes 'api' and 'etl' are in the same root directory.
# Adjust if your project structure is different.
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(
    current_dir))  # This should be the project_root
sys.path.append(project_root)


router = APIRouter(
    prefix="/process",
    tags=["ETL & ML Processing"]
)


class ETLParams(BaseModel):
    company_id: str = Field(..., example="COMP001")
    from_month: int = Field(..., example=1, ge=1, le=12)
    from_year: int = Field(..., example=2023, ge=1900, le=2100)
    to_month: int = Field(..., example=12, ge=1, le=12)
    to_year: int = Field(..., example=2023, ge=1900, le=2100)
    from_item_code: str = Field(..., example="ITEM000")
    to_item_code: str = Field(..., example="ITEM999")


@router.post("/trigger-etl", status_code=202)
async def trigger_etl(params: ETLParams, background_tasks: BackgroundTasks):
    """
    Triggers the ETL process to fetch data from SQL Server, transform it,
    and load it into MySQL. This is an asynchronous operation.
    """
    try:
        print(f"Received request to trigger ETL with params: {params.dict()}")
        # Run the ETL process in the background
        background_tasks.add_task(
            main_etl_process,
            params.company_id,
            str(params.from_month),  # etl_script expects string for month/year
            str(params.from_year),
            str(params.to_month),
            str(params.to_year),
            params.from_item_code,
            params.to_item_code
        )
        return {"message": "ETL process started in the background. Check server logs for progress."}
    except Exception as e:
        print(f"Error triggering ETL process: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to trigger ETL process: {str(e)}")


@router.post("/train-ml-model", status_code=202)
async def train_ml_model(background_tasks: BackgroundTasks):
    """
    Triggers the ML model training pipeline.
    This is an asynchronous operation.
    """
    try:
        print("Received request to train ML model (now folder generation).")
        # The parameters for run_training_pipeline (like num_clusters_l1) might also come from request body if needed.
        # Changed function call
        background_tasks.add_task(run_folder_generation_pipeline)
        return {"message": "Folder generation process started in the background. Check server logs for progress."}
    except Exception as e:
        print(f"Error triggering folder generation process: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to trigger folder generation process: {str(e)}")


# Removed response_model for now
@router.post("/classify-new-item", status_code=200)
async def classify_new_item(item_description: str = Query(..., description="Description of the item to classify")):
    """
    Classifies a new item based on its description using parsing rules.
    Returns L1 and L2 folder names.
    """
    try:
        print(
            f"Received request to classify new item (parsing): {item_description}")
        classification_result = classify_item_by_parsing(
            description=item_description
        )  # Returns dict with l1_folder, l2_folder

        if classification_result.get("error"):
            # This 'error' field in the parsing result is more of a status, not a system error.
            # For now, we'll still return it within a 200, but client should check it.
            print(
                f"Parsing issue for '{item_description}': {classification_result['error']}")
            # Or, decide if "UNCATEGORIZED" should be an HTTP error. For now, no.

        # Directly return the dictionary from classify_item_by_parsing
        # { "input_description": ..., "l1_folder": ..., "l2_folder": ..., "error": ... }
        return classification_result

    except Exception as e:
        print(f"Error during item classification by parsing: {e}")
        # This catches unexpected errors in the endpoint/service call itself
        raise HTTPException(
            status_code=500, detail=f"Failed to classify item by parsing: {str(e)}")
