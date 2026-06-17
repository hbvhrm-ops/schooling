# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /code

# Copy the requirements file first to leverage Docker cache
COPY ./requirements.txt /code/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of your application code
COPY . .

# Expose the port Hugging Face expects (Default is 7860)
EXPOSE 7860

# Command to run your app (adjust this to your specific entry point, e.g., app.py or main.py)
CMD ["python", "app.py"]