from ultralytics import YOLO

def main():
    model = YOLO(r"C:\Users\USER2\Desktop\yolo_project\runs\detect\train9\weights\last.pt")

    model.train(
        data=r"C:\Users\USER2\Desktop\yolo_project\crack-1\data.yaml",
        epochs=50,
        imgsz=640,
        device=0,
        workers=6,
        batch=16,
	resume=True
    )

if __name__ == "__main__":
    main()