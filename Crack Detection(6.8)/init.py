
from roboflow import Roboflow
from ultralytics import YOLO

def main():
    rf = Roboflow(api_key="PGxruSLOJ1nKBd6dAMbA")
    project = rf.project("crack-wyt8q-akcdn")
    version = project.version(1)
    dataset = version.download("yolov8")

    model = YOLO("yolov8n.pt")

    model.train(
        data=dataset.location + "/data.yaml",
        epochs=15,
        imgsz=640,
        device=0,
        workers=8
    )

if __name__ == "__main__":
    main()