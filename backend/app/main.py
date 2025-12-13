from fastapi import FastAPI

app = FastAPI(
    title="Hippo Campus API",
    description="Photo sharing and memory saving application",
    version="0.1.0",
)


@app.get("/")
async def root():
    return {"message": "Welcome to Hippo Campus!"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

