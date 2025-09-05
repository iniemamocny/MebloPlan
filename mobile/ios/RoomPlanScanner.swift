import Foundation
import RoomPlan
import ARKit

/// Scans a room using RoomPlan and uploads the result to a backend service.
/// The model is exported as OBJ which can later be converted to glTF.
class RoomPlanScanner: NSObject, RoomCaptureSessionDelegate {
    private let captureSession = RoomCaptureSession()
    private let captureView = RoomCaptureView()
    private var completion: ((URL) -> Void)?

    override init() {
        super.init()
        captureSession.delegate = self
        captureView.captureSession = captureSession
    }

    /// Start the scanning process.
    func startScanning() {
        let config = RoomCaptureSession.Configuration()
        captureSession.run(configuration: config)
    }

    /// Stop scanning and export the captured room as an OBJ file.
    func finishScanning() {
        captureSession.stop()
    }

    // MARK: - RoomCaptureSessionDelegate

    func captureSession(_ session: RoomCaptureSession, didEndWith capturedRoom: CapturedRoom, error: Error?) {
        guard error == nil else {
            print("Capture ended with error: \(String(describing: error))")
            return
        }
        let tmpURL = FileManager.default.temporaryDirectory.appendingPathComponent("room.obj")
        do {
            try capturedRoom.export(to: tmpURL, type: .obj)
            completion?(tmpURL)
            uploadModel(at: tmpURL)
        } catch {
            print("Failed to export room: \(error)")
        }
    }

    /// Upload exported model via HTTPS.
    private func uploadModel(at url: URL) {
        var request = URLRequest(url: URL(string: "https://example.com/upload")!)
        request.httpMethod = "POST"
        let task = URLSession.shared.uploadTask(with: request, fromFile: url) { _, response, error in
            if let error = error {
                print("Upload failed: \(error)")
            } else {
                print("Upload finished: \(String(describing: response))")
            }
        }
        task.resume()
    }
}
