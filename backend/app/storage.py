import os
import uuid
import logging
import requests
from google.cloud import storage

logger = logging.getLogger(__name__)

class StorageManager:
    def __init__(self):
        self.bucket_name = os.environ.get("GCP_BUCKET_NAME")
        self.client = None
        
        if self.bucket_name:
            try:
                self.client = storage.Client()
                logger.info(f"Storage client initialized for bucket: {self.bucket_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize GCS client: {e}. Falling back to external links.")
        else:
            logger.warning("GCP_BUCKET_NAME not set. Generated images will not be stored in Cloud Storage.")

    def upload_from_url(self, image_url: str, filename_prefix: str = "gen") -> str:
        """Downloads an image from a URL and uploads it to GCS."""
        if not self.client or not self.bucket_name:
            return image_url # Return original URL if no bucket is configured

        try:
            # Download the image
            response = requests.get(image_url, stream=True)
            response.raise_for_status()

            # Generate unique filename
            blob_name = f"{filename_prefix}_{uuid.uuid4().hex}.jpg"
            
            if not self.client:
                return image_url
                
            bucket = self.client.bucket(self.bucket_name)
            blob = bucket.blob(blob_name)

            # Upload
            blob.upload_from_string(response.content, content_type="image/jpeg")
            
            # Use public URL or signed URL (defaulting to public if bucket allows)
            return f"https://storage.googleapis.com/{self.bucket_name}/{blob_name}"

        except Exception as e:
            logger.error(f"Failed to upload image to GCS: {e}")
            return image_url
