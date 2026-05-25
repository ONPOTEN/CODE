import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';

class AdSenseBanner extends StatefulWidget {
  const AdSenseBanner({Key? key}) : super(key: key);

  @override
  State<AdSenseBanner> createState() => _AdSenseBannerState();
}

class _AdSenseBannerState extends State<AdSenseBanner> {
  late final String _viewId;

  @override
  void initState() {
    super.initState();
    _viewId = 'adsense-banner-${UniqueKey().toString()}';
    
    // ignore: undefined_prefixed_name
    ui_web.platformViewRegistry.registerViewFactory(_viewId, (int viewId) {
      final div = html.DivElement()
        ..style.width = '100%'
        ..style.height = '100%';

      final ins = html.Element.tag('ins')
        ..className = 'adsbygoogle'
        ..style.display = 'block'
        ..dataset['ad-client'] = 'ca-pub-8350902137868521'
        ..dataset['ad-slot'] = '2027584221'
        ..dataset['ad-format'] = 'auto'
        ..dataset['full-width-responsive'] = 'true';

      div.append(ins);

      // Execute push script asynchronously after adding element
      Future.delayed(const Duration(milliseconds: 100), () {
        try {
          final script = html.ScriptElement()
            ..text = '(adsbygoogle = window.adsbygoogle || []).push({});';
          html.document.body?.append(script);
        } catch (e) {
          print('AdSense push error: $e');
        }
      });

      return div;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      // Default AdSense responsive height can vary, usually ~100px for mobile banners or 250px for rectangles.
      // We'll give it a constrained box.
      constraints: const BoxConstraints(minHeight: 100, maxHeight: 250),
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: HtmlElementView(viewType: _viewId),
    );
  }
}
