"use client";
import * as ort from 'onnxruntime-web';
import { useState, useRef, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import AIAssistant from "@/components/AIAssistant";

const MODEL_CONFIG = {
  path: '/onnxmodel.onnx',
  inputName: 'input',
  outputName: 'output',
  classes: ['glioma','meningioma', 'notumor',  'pituitary'],
  imageSize: 224,
  mean: [0.485, 0.456, 0.406], // ImageNet standard normalization
  std: [0.229, 0.224, 0.225]   // ImageNet standard normalization
};

const Detection = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const fileInputRef = useRef(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const initModel = async () => {
      try {
        const newSession = await ort.InferenceSession.create(MODEL_CONFIG.path);
        setSession(newSession);
        console.log("Model loaded successfully");
        
        // Temporary test function to verify model behavior
        await testModel(newSession);
      } catch (err) {
        console.error("Model loading failed:", err);
        setError("Failed to load AI model. Please refresh the page.");
      }
    };

    const testModel = async (session) => {
      try {
        // Create a blank test tensor
        const testTensor = new ort.Tensor(
          'float32', 
          new Float32Array(3 * MODEL_CONFIG.imageSize * MODEL_CONFIG.imageSize).fill(0.5),
          [1, 3, MODEL_CONFIG.imageSize, MODEL_CONFIG.imageSize]
        );
        
        const output = await session.run({ [MODEL_CONFIG.inputName]: testTensor });
        console.log("Test model output:", output[MODEL_CONFIG.outputName].data);
      } catch (err) {
        console.error("Test model failed:", err);
      }
    };

    initModel();

    return () => {
      if (session) session.release();
    };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setImage(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setDebugInfo(null);
  };

  const preprocessImage = async (imgUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imgUrl;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = MODEL_CONFIG.imageSize;
          canvas.height = MODEL_CONFIG.imageSize;
          const ctx = canvas.getContext("2d");

          const scale = Math.min(
            MODEL_CONFIG.imageSize / img.width,
            MODEL_CONFIG.imageSize / img.height
          );
          const width = img.width * scale;
          const height = img.height * scale;
          const x = (MODEL_CONFIG.imageSize - width) / 2;
          const y = (MODEL_CONFIG.imageSize - height) / 2;

          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, MODEL_CONFIG.imageSize, MODEL_CONFIG.imageSize);
          ctx.drawImage(img, x, y, width, height);

          setDebugInfo({
            preprocessedImage: canvas.toDataURL(),
            originalSize: { width: img.width, height: img.height }
          });

          const imageData = ctx.getImageData(0, 0, MODEL_CONFIG.imageSize, MODEL_CONFIG.imageSize);
          const { data } = imageData;

          const floatData = new Float32Array(3 * MODEL_CONFIG.imageSize * MODEL_CONFIG.imageSize);
          
          // Enhanced normalization with mean/std subtraction
          for (let i = 0; i < MODEL_CONFIG.imageSize * MODEL_CONFIG.imageSize; i++) {
            floatData[i] = (data[i * 4] / 255.0 - MODEL_CONFIG.mean[0]) / MODEL_CONFIG.std[0]; // R
            floatData[i + MODEL_CONFIG.imageSize * MODEL_CONFIG.imageSize] = 
              (data[i * 4 + 1] / 255.0 - MODEL_CONFIG.mean[1]) / MODEL_CONFIG.std[1]; // G
            floatData[i + 2 * MODEL_CONFIG.imageSize * MODEL_CONFIG.imageSize] = 
              (data[i * 4 + 2] / 255.0 - MODEL_CONFIG.mean[2]) / MODEL_CONFIG.std[2]; // B
          }

          const inputTensor = new ort.Tensor("float32", floatData, [1, 3, MODEL_CONFIG.imageSize, MODEL_CONFIG.imageSize]);
          resolve(inputTensor);
        } catch (err) {
          reject(`Image processing error: ${err.message}`);
        }
      };
      img.onerror = () => reject("Error loading image");
    });
  };

  // Numerically stable softmax
  const softmax = (arr) => {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b);
    return exps.map(x => x / sum);
  };

  const handleUpload = async () => {
    if (!image) {
      setError("Please select an image first");
      return;
    }

    if (!session) {
      setError("AI model is not ready. Please try again later.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const tensor = await preprocessImage(image);
      const feeds = { [MODEL_CONFIG.inputName]: tensor };
      const outputData = await session.run(feeds);
      const output = outputData[MODEL_CONFIG.outputName].data;

      console.log("Raw model output:", output); // Debug output

      let probabilities;
      if (Math.max(...output) > 1) {
        probabilities = softmax(Array.from(output));
      } else {
        probabilities = Array.from(output);
      }

      console.log("Probabilities:", probabilities); // Debug probabilities

      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      const confidence = (probabilities[maxIndex] * 100).toFixed(2);

      const detailedResults = MODEL_CONFIG.classes.map((className, index) => ({
        class: className,
        probability: (probabilities[index] * 100).toFixed(2),
        isTop: index === maxIndex
      }));

      detailedResults.sort((a, b) => b.probability - a.probability);

      setResult({
        topClass: MODEL_CONFIG.classes[maxIndex],
        confidence,
        allClasses: detailedResults
      });

    } catch (err) {
      console.error("Prediction error:", err);
      setError(`Analysis failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="min-vh-100 bg-dark text-white">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            <div className="text-center mb-5">
              <h1 className="display-4 text-gradient mb-3 text-bold">
                <span className="text-primary">Brain Tumor</span>
                <span className="text-secondary"> Detection</span>
              </h1>
              <p className="lead text-muted">
                Upload a brain MRI scan for tumor detection and classification
              </p>
            </div>

            <div className="card bg-dark-2 border-secondary shadow-lg mb-4">
              <div className="card-body p-4">
                <div
                  className={`dropzone ${!image ? 'py-5' : 'pb-3'} text-center cursor-pointer`}
                  onClick={triggerFileInput}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="d-none"
                  />
                  {!image ? (
                    <>
                      <div className="mb-3">
                        <i className="bi bi-cloud-arrow-up text-primary" style={{ fontSize: "3rem" }}></i>
                      </div>
                      <h5 className="text-light">Drag & drop an MRI scan here</h5>
                      <p className="text-light">or click to browse files</p>
                      <small className="text-light">Supports JPG, PNG, WEBP (max 5MB)</small>
                    </>
                  ) : (
                    <div className="position-relative">
                      <img
                        src={image}
                        alt="Upload preview"
                        className="img-fluid rounded shadow"
                        style={{ maxHeight: "400px" }}
                      />
                      <button
                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImage(null);
                          setResult(null);
                        }}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  )}
                </div>

                <div className="d-grid gap-2 mt-3">
                  <button
                    onClick={handleUpload}
                    className="btn btn-primary btn-lg rounded-pill fw-bold"
                    disabled={loading || !image}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-magic me-2"></i>
                        Analyze MRI Scan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {(result || error) && (
              <div className="card bg-dark-2 border-secondary shadow-lg mt-4">
                <div className="card-body p-4">
                  <h5 className="card-title text-center mb-3">
                    <i className="bi bi-graph-up me-2"></i>
                    Analysis Results
                  </h5>

                  {error && (
                    <div className="alert alert-danger d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <div>{error}</div>
                    </div>
                  )}

                  {result && (
                    <div className="results-container">
                      <div className={`alert ${result.topClass === 'notumor' ? 'alert-success' : 'alert-warning'} d-flex align-items-center`}>
                        <i className={`bi ${result.topClass === 'notumor' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                        <div>
                          <strong>Primary Detection:</strong> {result.topClass} ({result.confidence}% confidence)
                        </div>
                      </div>

                      <div className="mt-4">
                        <h6>Detailed Probabilities:</h6>
                        <div className="progress-container">
                          {result.allClasses.map((item, index) => (
                            <div key={index} className="mb-3">
                              <div className="d-flex justify-content-between mb-1">
                                <span className={item.isTop ? "fw-bold text-primary" : ""}>
                                  {item.class}
                                  {item.isTop && <span className="ms-2">(Highest)</span>}
                                </span>
                                <span>{item.probability}%</span>
                              </div>
                              <div className="progress" style={{ height: "10px" }}>
                                <div
                                  className={`progress-bar ${item.isTop ? 'bg-primary' : 'bg-secondary'}`}
                                  role="progressbar"
                                  style={{ width: `${item.probability}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && debugInfo && (
              <div className="card bg-dark-2 border-secondary shadow-lg mt-4">
                <div className="card-body p-4">
                  <h5 className="card-title text-center mb-3">
                    <i className="bi bi-bug-fill me-2"></i>
                    Debug Information
                  </h5>
                  <div className="row">
                    <div className="col-md-6">
                      <p>Original Size: {debugInfo.originalSize.width} × {debugInfo.originalSize.height}px</p>
                      <p>Preprocessed Image:</p>
                      <img 
                        src={debugInfo.preprocessedImage} 
                        alt="Preprocessed" 
                        className="img-fluid rounded border border-secondary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="row justify-content-center mt-5">
              <div className="col-lg-8 col-md-10">
                <div className="card bg-dark-2 border-secondary shadow-lg">
                  <div className="card-body">
                    <AIAssistant />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css"
      />

      <style jsx>{`
        .bg-dark-2 {
          background-color: #1a1a1a;
        }
        .text-gradient {
          background: linear-gradient(45deg, #3a7bd5, #00d2ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }
        .dropzone {
          border: 2px dashed #3a7bd5;
          border-radius: 10px;
          transition: all 0.3s;
        }
        .dropzone:hover {
          background-color: rgba(58, 123, 213, 0.1);
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .progress-container {
          background-color: #2a2a2a;
          padding: 1rem;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default Detection;
