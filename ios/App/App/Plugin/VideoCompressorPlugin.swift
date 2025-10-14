import Foundation
import Capacitor
import ffmpegkit

@objc(VideoCompressorPlugin)
public class VideoCompressorPlugin: CAPPlugin {
    private var currentSession: FFmpegSession?
    
    @objc func compressVideo(_ call: CAPPluginCall) {
        guard let inputPath = call.getString("inputPath"),
              let outputPath = call.getString("outputPath") else {
            call.reject("Input and output paths are required")
            return
        }
        
        let quality = call.getInt("quality") ?? 23
        let preset = call.getString("preset") ?? "veryfast"
        let videoCodec = call.getString("videoCodec") ?? "libx264"
        let audioCodec = call.getString("audioCodec") ?? "aac"
        let maxWidth = call.getInt("maxWidth")
        let maxHeight = call.getInt("maxHeight")
        
        // Get real file path
        let realInputPath = getRealPath(inputPath)
        
        // Check if input file exists
        guard FileManager.default.fileExists(atPath: realInputPath) else {
            call.reject("Input file does not exist: \(inputPath)")
            return
        }
        
        // Get original file size
        let originalSize = getFileSize(realInputPath)
        let startTime = Date()
        
        // Build FFmpeg command
        var command = "-i \"\(realInputPath)\""
        command += " -vcodec \(videoCodec)"
        command += " -crf \(quality)"
        command += " -preset \(preset)"
        command += " -acodec \(audioCodec)"
        
        // Scale if max dimensions specified
        if let scale = buildScaleFilter(maxWidth: maxWidth, maxHeight: maxHeight) {
            command += " -vf \"\(scale)\""
        }
        
        // Optimize for streaming
        command += " -movflags +faststart"
        
        // Overwrite output file
        command += " -y \"\(outputPath)\""
        
        print("VideoCompressor: FFmpeg command: \(command)")
        
        // Execute FFmpeg command
        currentSession = FFmpegKit.executeAsync(command,
            withCompleteCallback: { session in
                guard let session = session else {
                    call.reject("FFmpeg session is nil")
                    return
                }
                
                let returnCode = session.getReturnCode()
                
                if ReturnCode.isSuccess(returnCode) {
                    // Compression successful
                    let compressedSize = self.getFileSize(outputPath)
                    let processingTime = Date().timeIntervalSince(startTime) * 1000
                    let compressionRatio = Double(compressedSize) / Double(originalSize)
                    
                    call.resolve([
                        "outputPath": outputPath,
                        "originalSize": originalSize,
                        "compressedSize": compressedSize,
                        "compressionRatio": compressionRatio,
                        "processingTime": processingTime
                    ])
                } else {
                    let error = "Compression failed with return code: \(returnCode?.getValue() ?? -1)"
                    print("VideoCompressor: \(error)")
                    if let output = session.getOutput() {
                        print("VideoCompressor: FFmpeg output: \(output)")
                    }
                    call.reject(error)
                }
                
                self.currentSession = nil
            },
            withLogCallback: { log in
                if let log = log {
                    print("VideoCompressor: FFmpeg: \(log.getMessage() ?? "")")
                }
            },
            withStatisticsCallback: { statistics in
                if let statistics = statistics {
                    let time = statistics.getTime()
                    let speed = statistics.getSpeed()
                    print("VideoCompressor: Progress - Time: \(time)ms, Speed: \(speed)x")
                    
                    // Notify progress to JavaScript
                    self.notifyListeners("compressionProgress", data: [
                        "time": time,
                        "speed": speed
                    ])
                }
            }
        )
    }
    
    @objc func extractThumbnail(_ call: CAPPluginCall) {
        guard let inputPath = call.getString("inputPath"),
              let outputPath = call.getString("outputPath") else {
            call.reject("Input and output paths are required")
            return
        }
        
        let timeInSeconds = call.getDouble("timeInSeconds") ?? 1.0
        let width = call.getInt("width")
        let height = call.getInt("height")
        let quality = call.getInt("quality") ?? 85
        
        let realInputPath = getRealPath(inputPath)
        
        // Build FFmpeg command for thumbnail extraction
        var command = "-i \"\(realInputPath)\""
        command += " -ss \(timeInSeconds)"
        command += " -vframes 1"
        
        // Scale if dimensions specified
        if let scale = buildScaleFilter(maxWidth: width, maxHeight: height) {
            command += " -vf \"\(scale)\""
        }
        
        // JPEG quality (convert 0-100 to 31-2)
        let jpegQuality = Int(31 - (Double(quality) * 0.31))
        command += " -q:v \(jpegQuality)"
        
        command += " -y \"\(outputPath)\""
        
        print("VideoCompressor: Thumbnail command: \(command)")
        
        FFmpegKit.executeAsync(command) { session in
            guard let session = session else {
                call.reject("FFmpeg session is nil")
                return
            }
            
            let returnCode = session.getReturnCode()
            
            if ReturnCode.isSuccess(returnCode) {
                call.resolve([
                    "outputPath": outputPath,
                    "width": width ?? 0,
                    "height": height ?? 0
                ])
            } else {
                call.reject("Thumbnail extraction failed: \(returnCode?.getValue() ?? -1)")
            }
        }
    }
    
    @objc func getVideoMetadata(_ call: CAPPluginCall) {
        guard let inputPath = call.getString("inputPath") else {
            call.reject("Input path is required")
            return
        }
        
        let realInputPath = getRealPath(inputPath)
        let fileSize = getFileSize(realInputPath)
        
        // For simplicity, return basic metadata
        // In production, you'd use ffprobe to get detailed metadata
        call.resolve([
            "fileSize": fileSize,
            "duration": 0,
            "width": 0,
            "height": 0,
            "bitrate": 0,
            "codec": "unknown",
            "fps": 0
        ])
    }
    
    @objc func cancelCompression(_ call: CAPPluginCall) {
        if let session = currentSession {
            session.cancel()
            currentSession = nil
            call.resolve()
        } else {
            call.reject("No active compression session")
        }
    }
    
    // MARK: - Helper Methods
    
    private func getRealPath(_ path: String) -> String {
        // Remove file:// prefix if present
        if path.hasPrefix("file://") {
            return String(path.dropFirst(7))
        }
        return path
    }
    
    private func getFileSize(_ path: String) -> Int64 {
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: path)
            return attributes[.size] as? Int64 ?? 0
        } catch {
            print("VideoCompressor: Error getting file size: \(error)")
            return 0
        }
    }
    
    private func buildScaleFilter(maxWidth: Int?, maxHeight: Int?) -> String? {
        if let maxWidth = maxWidth, let maxHeight = maxHeight {
            return "scale='min(\(maxWidth),iw)':'min(\(maxHeight),ih)':force_original_aspect_ratio=decrease"
        } else if let maxWidth = maxWidth {
            return "scale=\(maxWidth):-2"
        } else if let maxHeight = maxHeight {
            return "scale=-2:\(maxHeight)"
        }
        return nil
    }
}
