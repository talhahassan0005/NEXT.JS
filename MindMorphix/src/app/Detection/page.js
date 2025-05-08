"use client";
import { useState, useRef } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import AIAssistant from "@/components/AIAssistant";

const Detection = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image");
      return;
    }

    setImage(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!image) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });

      const formData = new FormData();
      formData.append("file", file);

      const apiResponse = await fetch("http://localhost:8000/predict/", {
        method: "POST",
        body: formData,
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.detail || "Detection failed");
      }

      const data = await apiResponse.json();
      setResult(data.prediction);
    } catch (err) {
      setError(err.message || "An error occurred");
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
                <span className="text-primary">Image</span>
                <span className="text-secondary"> Detection</span>
              </h1>
              <p className="lead text-muted">
                Upload an image to analyze its contents with AI
              </p>
            </div>

            <div className="card bg-dark-2 border-secondary shadow-lg mb-4">
              <div className="card-body p-4">
                {/* File Upload Area */}
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
                      <h5 className="text-light">Drag & drop an image here</h5>
                      <p className="text-light">or click to browse files</p>
                      <small className="text-light">Supports JPG, PNG, WEBP</small>
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
                        }}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
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
                        Analyze Image
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {(result || error) && (
              <div className="card bg-dark-2 border-secondary shadow-lg mt-4">
                <div className="card-body p-4">
                  <h5 className="card-title text-center mb-3">
                    <i className="bi bi-graph-up me-2"></i>
                    Detection Results
                  </h5>

                  {error && (
                    <div className="alert alert-danger d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <div>{error}</div>
                    </div>
                  )}

                  {result && (
                    <div className="alert alert-success d-flex align-items-center">
                      <i className="bi bi-check-circle-fill me-2"></i>
                      <div>
                        <strong>Analysis Result:</strong> {result}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AIAssistant Component */}
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

      {/* Bootstrap Icons */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css"
      />

      {/* Custom CSS */}
      <style jsx>{`
        .bg-dark-2 {
          background-color: #1a1a1a;
        }
        .text-gradient {
          background: linear-gradient(45deg, rgb(243, 243, 243), #8f94fb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }
        .dropzone {
          border: 2px dashed rgb(249, 250, 252);
          border-radius: 10px;
          transition: all 0.3s;
        }
        .dropzone:hover {
          background-color: rgba(78, 84, 200, 0.1);
        }
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default Detection;
