import "leaflet";

declare module "leaflet" {
  type HeatLatLngTuple = [number, number, number];

  interface HeatMapOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends TileLayer {
    setOptions(options: HeatMapOptions): HeatLayer;
    addLatLng(latlng: LatLng | HeatLatLngTuple): HeatLayer;
    setLatLngs(latlngs: Array<LatLng | HeatLatLngTuple>): HeatLayer;
  }

  function heatLayer(
    latlngs: Array<LatLng | HeatLatLngTuple>,
    options?: HeatMapOptions,
  ): HeatLayer;
}

declare module "leaflet.heat";
