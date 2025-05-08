import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms, models
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
CLASS_NAMES = ['glioma', 'meningioma', 'notumor', 'pituitary']  # Added 'notumor' based on your training code
NUM_CLASSES = len(CLASS_NAMES)
MODEL_FILENAME = "model.pth"  # Changed to match your saved model name

# Get base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Define your TumorClassifier class (must match training code exactly)
class TumorClassifier(nn.Module):
    def __init__(self, num_classes):
        super(TumorClassifier, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2)
        )
        self.classifier = nn.Sequential(
            nn.Linear(32 * 56 * 56, 128),
            nn.ReLU(inplace=True),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x

def load_model():
    """Load the custom TumorClassifier model"""
    try:
        model_path = os.path.join(BASE_DIR, MODEL_FILENAME)
        logger.info(f"Loading model from: {model_path}")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")

        # Initialize model with correct architecture
        model = TumorClassifier(num_classes=NUM_CLASSES)
        
        # Load state dict
        state_dict = torch.load(model_path, map_location=torch.device('cpu'))
        model.load_state_dict(state_dict)
        model.eval()
        
        logger.info("✅ Model loaded successfully")
        return model

    except Exception as e:
        logger.error(f"❌ Failed to load model: {str(e)}")
        if 'state_dict' in locals():
            logger.info(f"State dict keys: {list(state_dict.keys())}")
        raise

# Load model on startup
try:
    model = load_model()
except Exception as e:
    logger.error(f"Failed to initialize model: {str(e)}")
    raise RuntimeError("Model initialization failed") from e

# Transform image (matches your training preprocessing)
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                       std=[0.229, 0.224, 0.225])
])

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    try:
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        input_tensor = transform(image).unsqueeze(0)

        # Make prediction
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            predicted_class = predicted.item()
            confidence_value = confidence.item()

        return {
            "prediction": CLASS_NAMES[predicted_class],
            "confidence": round(confidence_value, 4),
            "class_probabilities": {
                cls: round(prob.item(), 4)
                for cls, prob in zip(CLASS_NAMES, probabilities[0])
            }
        }

    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/healthcheck")
async def healthcheck():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_class": model.__class__.__name__,
        "num_classes": NUM_CLASSES
    }