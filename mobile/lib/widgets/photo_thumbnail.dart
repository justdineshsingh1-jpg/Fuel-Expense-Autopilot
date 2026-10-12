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
    final bool hasPath = path.trim().isNotEmpty;
    final bool isHttp = hasPath && (path.startsWith('http://') || path.startsWith('https://'));

    Widget buildImageWidget(BoxFit fit) {
      if (!hasPath) {
        return const Center(child: Icon(Icons.image_not_supported, color: Colors.grey));
      }
      if (isHttp) {
        return CachedNetworkImage(
          imageUrl: path,
          fit: fit,
          placeholder: (context, url) => const Center(
            child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
          ),
          errorWidget: (context, url, error) => const Center(
            child: Icon(Icons.broken_image, color: Colors.grey),
          ),
        );
      }
      try {
        final file = File(path);
        if (file.existsSync()) {
          return Image.file(file, fit: fit);
        }
      } catch (_) {}
      return const Center(child: Icon(Icons.broken_image, color: Colors.grey));
    }

    return GestureDetector(
      onTap: () {
        if (!hasPath) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => Scaffold(
              backgroundColor: Colors.black,
              appBar: AppBar(
                backgroundColor: Colors.transparent,
                iconTheme: const IconThemeData(color: Colors.white),
              ),
              body: Center(
                child: InteractiveViewer(
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
          color: Colors.grey[100],
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        clipBehavior: Clip.antiAlias,
        child: buildImageWidget(BoxFit.cover),
      ),
    );
  }
}
