import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import '../models/trip_location.dart';

class RouteMapWidget extends StatefulWidget {
  final String? tripId;
  final List<Map<String, dynamic>>? waypoints;
  final List<TripLocation>? locations;
  final double? claimedKm;
  final bool isLive;

  const RouteMapWidget({
    super.key,
    this.tripId,
    this.waypoints,
    this.locations,
    this.claimedKm,
    this.isLive = false,
  });

  @override
  State<RouteMapWidget> createState() => _RouteMapWidgetState();
}

class _RouteMapWidgetState extends State<RouteMapWidget> {
  final MapController _mapController = MapController();
  List<LatLng> _points = [];
  bool _isLoading = true;
  String? _errorMessage;
  double _calculatedTrackKm = 0.0;

  @override
  void initState() {
    super.initState();
    _loadRouteData();
  }

  @override
  void didUpdateWidget(covariant RouteMapWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.waypoints != oldWidget.waypoints || widget.tripId != oldWidget.tripId) {
      _loadRouteData();
    }
  }

  Future<void> _loadRouteData() async {
    // 1. If waypoints passed directly (e.g. live trip)
    if (widget.waypoints != null && widget.waypoints!.isNotEmpty) {
      _parseWaypoints(widget.waypoints!);
      if (mounted) setState(() => _isLoading = false);
      _fitBounds();
      return;
    }

    // 2. Fetch from Supabase map_history bucket
    if (widget.tripId != null && widget.tripId!.isNotEmpty && !widget.tripId!.startsWith('offline_')) {
      final tripMapUrl = 'https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/map_history/${widget.tripId}.json';
      try {
        final res = await http.get(Uri.parse(tripMapUrl)).timeout(const Duration(seconds: 6));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['waypoints'] != null && data['waypoints'] is List) {
            final list = List<Map<String, dynamic>>.from(
              (data['waypoints'] as List).map((w) => Map<String, dynamic>.from(w)),
            );
            _parseWaypoints(list);
            if (mounted) setState(() => _isLoading = false);
            _fitBounds();
            return;
          }
        }
      } catch (_) {}
    }

    // 3. Fallback: Parse from trip.locations
    if (widget.locations != null && widget.locations!.isNotEmpty) {
      final pts = widget.locations!.map((loc) => LatLng(loc.lat, loc.lng)).toList();
      _computeDistance(pts);
      if (mounted) {
        setState(() {
          _points = pts;
          _isLoading = false;
        });
      }
      _fitBounds();
      return;
    }

    if (mounted) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'No GPS route coordinates recorded for this trip.';
      });
    }
  }

  void _parseWaypoints(List<Map<String, dynamic>> waypointsList) {
    final List<LatLng> pts = [];
    for (final w in waypointsList) {
      final lat = (w['lat'] as num?)?.toDouble();
      final lng = (w['lng'] as num?)?.toDouble();
      if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
        pts.add(LatLng(lat, lng));
      }
    }
    _computeDistance(pts);
    _points = pts;
  }

  void _computeDistance(List<LatLng> pts) {
    double totalMeters = 0.0;
    for (int i = 0; i < pts.length - 1; i++) {
      totalMeters += Geolocator.distanceBetween(
        pts[i].latitude,
        pts[i].longitude,
        pts[i + 1].latitude,
        pts[i + 1].longitude,
      );
    }
    _calculatedTrackKm = totalMeters / 1000.0;
  }

  void _fitBounds() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_points.isEmpty || !mounted) return;
      if (_points.length == 1) {
        _mapController.move(_points.first, 15.0);
        return;
      }

      final bounds = LatLngBounds.fromPoints(_points);
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.all(40),
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            color: Colors.grey.shade50,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 20, color: Colors.blue.shade700),
                    const SizedBox(width: 8),
                    const Text(
                      'GPS Route Map',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ],
                ),
                if (_points.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Text(
                      '${_calculatedTrackKm.toStringAsFixed(1)} KM Track',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1D5BB5),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Map Area
          SizedBox(
            height: 250,
            width: double.infinity,
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _points.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.map_outlined, size: 40, color: Colors.grey.shade400),
                            const SizedBox(height: 8),
                            Text(
                              _errorMessage ?? 'No GPS points found.',
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                            ),
                          ],
                        ),
                      )
                    : Stack(
                        children: [
                          FlutterMap(
                            mapController: _mapController,
                            options: MapOptions(
                              initialCenter: _points.isNotEmpty
                                  ? _points.first
                                  : const LatLng(27.4924, 95.3468), // Tinsukia fallback
                              initialZoom: 13.0,
                              interactionOptions: const InteractionOptions(
                                flags: InteractiveFlag.all,
                              ),
                            ),
                            children: [
                              TileLayer(
                                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                userAgentPackageName: 'com.example.mobile',
                              ),
                              PolylineLayer(
                                polylines: [
                                  Polyline(
                                    points: _points,
                                    strokeWidth: 4.5,
                                    color: const Color(0xFF0284C7),
                                  ),
                                ],
                              ),
                              MarkerLayer(
                                markers: [
                                  // Start Marker (Green)
                                  Marker(
                                    point: _points.first,
                                    width: 36,
                                    height: 36,
                                    child: const Icon(
                                      Icons.location_pin,
                                      color: Colors.green,
                                      size: 36,
                                    ),
                                  ),
                                  // End Marker (Red)
                                  if (_points.length > 1)
                                    Marker(
                                      point: _points.last,
                                      width: 36,
                                      height: 36,
                                      child: Icon(
                                        widget.isLive ? Icons.navigation : Icons.location_pin,
                                        color: widget.isLive ? Colors.blue : Colors.red,
                                        size: 36,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),

                          // Zoom & Recenter Controls Overlay
                          Positioned(
                            top: 10,
                            left: 10,
                            child: Column(
                              children: [
                                _MapButton(
                                  icon: Icons.add,
                                  onPressed: () {
                                    _mapController.move(
                                      _mapController.camera.center,
                                      _mapController.camera.zoom + 1,
                                    );
                                  },
                                ),
                                const SizedBox(height: 6),
                                _MapButton(
                                  icon: Icons.remove,
                                  onPressed: () {
                                    _mapController.move(
                                      _mapController.camera.center,
                                      _mapController.camera.zoom - 1,
                                    );
                                  },
                                ),
                                const SizedBox(height: 6),
                                _MapButton(
                                  icon: Icons.center_focus_strong,
                                  onPressed: _fitBounds,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
          ),

          // Route Metrics Footer (Matching Admin Panel)
          if (_points.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey.shade200)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Map Route (Polyline)',
                            style: TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${_calculatedTrackKm.toStringAsFixed(1)} KM',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                        ],
                      ),
                      if (widget.claimedKm != null)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const Text(
                              'Odometer Claimed',
                              style: TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${widget.claimedKm!.toStringAsFixed(1)} KM',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                          ],
                        ),
                      if (widget.claimedKm != null)
                        Builder(builder: (context) {
                          final discrepancy = widget.claimedKm! - _calculatedTrackKm;
                          final isHigh = discrepancy.abs() > 3.0;
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                'Discrepancy',
                                style: TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${discrepancy >= 0 ? "+" : ""}${discrepancy.toStringAsFixed(1)} KM',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isHigh ? Colors.red : Colors.green,
                                ),
                              ),
                            ],
                          );
                        }),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${_points.length} GPS coordinates verified',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      if (widget.isLive)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.circle, color: Colors.green, size: 8),
                              SizedBox(width: 4),
                              Text(
                                'LIVE',
                                style: TextStyle(
                                  color: Colors.green,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _MapButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;

  const _MapButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(6),
        child: SizedBox(
          width: 32,
          height: 32,
          child: Icon(icon, size: 18, color: Colors.black87),
        ),
      ),
    );
  }
}
