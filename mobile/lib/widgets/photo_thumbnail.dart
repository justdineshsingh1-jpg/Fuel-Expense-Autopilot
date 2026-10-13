import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class PhotoThumbnail extends StatelessWidget {
  final String path;
  final bool isNetwork;
  final double size;

  const PhotoThumbnail({
    super.key,
    required this.path,
    this.isNetwork = false,
    this.size = 100,
  });

  @override
  Widget build(BuildContext context) {
    final String cleanPath = path.trim();
    final bool hasPath = cleanPath.isNotEmpty;
    final bool isHttp = hasPath && (cleanPath.startsWith('http://') || cleanPath.startsWith('https://'));

    Widget buildPlaceholder() {
      return Container(
        color: Colors.grey.shade100,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.image_outlined, color: Colors.grey.shade400, size: size * 0.35),
            const SizedBox(height: 2),
            Text(
              'No photo',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 10, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    Widget buildImageWidget(BoxFit fit) {
      if (!hasPath) {
        return buildPlaceholder();
      }

      if (isHttp) {
        return CachedNetworkImage(
          imageUrl: cleanPath,
          fit: fit,
          placeholder: (context, url) => Center(
            child: SizedBox(
              width: 24, 
              height: 24, 
              child: CircularProgressIndicator(strokeWidth: 2, color: Theme.of(context).primaryColor),
            ),
          ),
          errorWidget: (context, url, error) => Container(
            color: Colors.grey.shade100,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.photo_camera_outlined, color: Colors.blueGrey.shade400, size: size * 0.35),
                const SizedBox(height: 2),
                Text(
                  'Evidence Photo',
                  style: TextStyle(color: Colors.blueGrey.shade600, fontSize: 10, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        );
      }

      try {
        final file = File(cleanPath);
        if (file.existsSync()) {
          return Image.file(file, fit: fit);
        }
      } catch (_) {}

      return buildPlaceholder();
    }

    return GestureDetector(
      onTap: () {
        if (!hasPath) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => Scaffold(
              backgroundColor: Colors.black,
              appBar: AppBar(
                backgroundColor: Colors.black,
                iconTheme: const IconThemeData(color: Colors.white),
                title: const Text('Evidence Photo', style: TextStyle(color: Colors.white)),
              ),
              body: Center(
                child: InteractiveViewer(
                  maxScale: 4.0,
                  child: buildImageWidget(BoxFit.contain),
                ),
              ),
            ),
          ),
        );
      },
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: buildImageWidget(BoxFit.cover),
      ),
    );
  }
}
