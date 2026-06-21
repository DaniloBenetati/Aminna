import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, CheckCircle, RefreshCw, ZoomIn, Info, AlertTriangle, 
  Map as MapIcon, Globe, Navigation, ChevronRight, BarChart2, DollarSign,
  Maximize2, Minimize2
} from 'lucide-react';

// Common city coordinates lookup for São Paulo region to resolve instantly
const CITY_COORDINATES_LOOKUP: Record<string, { lat: number; lng: number }> = {
  'são paulo': { lat: -23.55052, lng: -46.633308 },
  'sao paulo': { lat: -23.55052, lng: -46.633308 },
  'santo andré': { lat: -23.6666, lng: -46.5333 },
  'santo andre': { lat: -23.6666, lng: -46.5333 },
  'são bernardo do campo': { lat: -23.6939, lng: -46.5653 },
  'sao bernardo do campo': { lat: -23.6939, lng: -46.5653 },
  'são caetano do sul': { lat: -23.6225, lng: -46.5489 },
  'sao caetano do sul': { lat: -23.6225, lng: -46.5489 },
  'diadema': { lat: -23.6814, lng: -46.6206 },
  'mauá': { lat: -23.6678, lng: -46.4614 },
  'maua': { lat: -23.6678, lng: -46.4614 },
  'guarulhos': { lat: -23.4539, lng: -46.5333 },
  'osasco': { lat: -23.5325, lng: -46.7917 },
  'barueri': { lat: -23.5111, lng: -46.8764 },
  'taboão da serra': { lat: -23.6247, lng: -46.7867 },
  'taboao da serra': { lat: -23.6247, lng: -46.7867 },
  'cotia': { lat: -23.6039, lng: -46.9194 },
  'embu das artes': { lat: -23.6489, lng: -46.8531 },
  'jardim paulista': { lat: -23.5727, lng: -46.6622 },
  'moema': { lat: -23.5986, lng: -46.6607 },
  'pinheiros': { lat: -23.5671, lng: -46.6902 },
  'vila mariana': { lat: -23.5892, lng: -46.6346 },
  'bela vista': { lat: -23.5615, lng: -46.6496 },
  'itaim bibi': { lat: -23.5849, lng: -46.6775 },
  'vila olimpia': { lat: -23.5956, lng: -46.6859 },
  'brooklin': { lat: -23.6121, lng: -46.6917 },
  'campinas': { lat: -22.9099, lng: -47.0626 },
  'santos': { lat: -23.9608, lng: -46.3336 },
  'são josé dos campos': { lat: -23.2237, lng: -45.9009 },
  'sao jose dos campos': { lat: -23.2237, lng: -45.9009 },
  'sorocaba': { lat: -23.5015, lng: -47.4526 },
  'jundiaí': { lat: -23.1864, lng: -46.8842 },
  'jundiai': { lat: -23.1864, lng: -46.8842 },
  'alphaville': { lat: -23.4975, lng: -46.8488 },
};

// Target location parser helper
interface TargetLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  adSetName: string;
  campaignName: string;
  spend: number;
  conversions: number;
  clicks: number;
  isActive: boolean;
  type: 'city' | 'custom' | 'unknown';
}

const SALON_REF = { lat: -23.5874, lng: -46.6576, name: "Aminna Salão" };

export const GeoTrafficMap: React.FC<{ adSets: any[], ads?: any[], loading?: boolean, hasFetched?: boolean }> = ({ adSets = [], ads = [], loading = false, hasFetched = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.FeatureGroup | null>(null);

  const [geocodedLocations, setGeocodedLocations] = useState<TargetLocation[]>([]);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [geocodingCache, setGeocodingCache] = useState<Record<string, { lat: number; lng: number }>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Monitor theme change
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // 1b. Invalidate map size on fullscreen toggle
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
    }
  }, [isFullscreen]);

  // 2. Mock Data Generator for Simulation Mode
  const getMockLocations = (): TargetLocation[] => {
    return [
      {
        id: 'mock-1',
        name: 'Moema (Raio 3km)',
        lat: -23.5986,
        lng: -46.6607,
        radiusMeters: 3000,
        adSetName: 'Moema - Público Feminino 25-50',
        campaignName: 'Aminna Ads - Captação de Clientes',
        spend: 420.50,
        conversions: 35,
        clicks: 145,
        isActive: true,
        type: 'custom'
      },
      {
        id: 'mock-2',
        name: 'Jardim Paulista (Raio 2km)',
        lat: -23.5727,
        lng: -46.6622,
        radiusMeters: 2000,
        adSetName: 'Jardim Paulista - Escova e Penteado',
        campaignName: 'Aminna Ads - Captação de Clientes',
        spend: 280.00,
        conversions: 24,
        clicks: 95,
        isActive: true,
        type: 'custom'
      },
      {
        id: 'mock-3',
        name: 'Itaim Bibi (Raio 4km)',
        lat: -23.5849,
        lng: -46.6775,
        radiusMeters: 4000,
        adSetName: 'Itaim Bibi - Coloração & Tratamento',
        campaignName: 'Aminna Ads - Conversão Direct',
        spend: 580.40,
        conversions: 48,
        clicks: 180,
        isActive: true,
        type: 'custom'
      },
      {
        id: 'mock-4',
        name: 'Santo André (Raio 10km)',
        lat: -23.6666,
        lng: -46.5333,
        radiusMeters: 10000,
        adSetName: 'Santo André - Público Geral',
        campaignName: 'Aminna Ads - Reconhecimento de Marca',
        spend: 150.00,
        conversions: 8,
        clicks: 50,
        isActive: false,
        type: 'city'
      },
      {
        id: 'mock-5',
        name: 'Vila Mariana (Raio 5km)',
        lat: -23.5892,
        lng: -46.6346,
        radiusMeters: 5000,
        adSetName: 'Vila Mariana - Manicure e Estética',
        campaignName: 'Aminna Ads - Conversão Direct',
        spend: 390.20,
        conversions: 31,
        clicks: 130,
        isActive: true,
        type: 'custom'
      }
    ];
  };

  // 3. Main geocoding logic
  useEffect(() => {
    const parseMetaAdSets = async () => {
      const activeAdSets = [...adSets].filter(a => a.status === 'ACTIVE' || a.status === 'PAUSED');

      if (activeAdSets.length === 0) {
        // Fallback to mock data if no adsets are returned from Meta
        setGeocodedLocations(getMockLocations());
        return;
      }

      setIsGeocoding(true);
      const parsedPoints: TargetLocation[] = [];

      for (const a of activeAdSets) {
        const geo = a.targeting?.geo_locations;
        if (!geo) continue;

        const spend = a.spend || 0;
        const conversions = a.conversions || 0;
        const clicks = a.clicks || 0;
        const isActive = a.status === 'ACTIVE';

        // Process custom coordinate locations
        if (geo.custom_locations) {
          for (const loc of geo.custom_locations) {
            const unitMult = loc.distance_unit === 'mile' ? 1609.34 : 1000;
            parsedPoints.push({
              id: `${a.id}-custom-${loc.latitude}-${loc.longitude}`,
              name: loc.name || `Localização Customizada (${loc.radius}${loc.distance_unit === 'mile' ? 'mi' : 'km'})`,
              lat: loc.latitude,
              lng: loc.longitude,
              radiusMeters: loc.radius * unitMult,
              adSetName: a.name,
              campaignName: a.campaign_name || 'Campanha',
              spend,
              conversions,
              clicks,
              isActive,
              type: 'custom'
            });
          }
        }

        // Process targeted cities
        if (geo.cities) {
          for (const city of geo.cities) {
            const cityNameClean = city.name.toLowerCase().trim();
            const radius = city.radius || 15;
            const unitMult = city.distance_unit === 'mile' ? 1609.34 : 1000;
            const radiusMeters = radius * unitMult;

            // 1. Try local lookup first (instant)
            if (CITY_COORDINATES_LOOKUP[cityNameClean]) {
              parsedPoints.push({
                id: `${a.id}-city-${city.key}`,
                name: city.name,
                lat: CITY_COORDINATES_LOOKUP[cityNameClean].lat,
                lng: CITY_COORDINATES_LOOKUP[cityNameClean].lng,
                radiusMeters,
                adSetName: a.name,
                campaignName: a.campaign_name || 'Campanha',
                spend,
                conversions,
                clicks,
                isActive,
                type: 'city'
              });
            } 
            // 2. Try state cache next
            else if (geocodingCache[cityNameClean]) {
              parsedPoints.push({
                id: `${a.id}-city-${city.key}`,
                name: city.name,
                lat: geocodingCache[cityNameClean].lat,
                lng: geocodingCache[cityNameClean].lng,
                radiusMeters,
                adSetName: a.name,
                campaignName: a.campaign_name || 'Campanha',
                spend,
                conversions,
                clicks,
                isActive,
                type: 'city'
              });
            }
            // 3. Fallback to OSM Nominatim API
            else {
              try {
                const formatted = encodeURIComponent(city.name + ', Brasil');
                const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${formatted}&format=json&limit=1`, {
                  headers: { 'User-Agent': 'AminnaMarketingDashboard/1.0' }
                });
                const data = await resp.json();
                if (data && data[0]) {
                  const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                  
                  // Save to cache
                  setGeocodingCache(prev => ({ ...prev, [cityNameClean]: coords }));
                  
                  parsedPoints.push({
                    id: `${a.id}-city-${city.key}`,
                    name: city.name,
                    lat: coords.lat,
                    lng: coords.lng,
                    radiusMeters,
                    adSetName: a.name,
                    campaignName: a.campaign_name || 'Campanha',
                    spend,
                    conversions,
                    clicks,
                    isActive,
                    type: 'city'
                  });
                }
              } catch (err) {
                console.error("OSM Geocoding failed", err);
              }
            }
          }
        }
      }

      setGeocodedLocations(parsedPoints.length > 0 ? parsedPoints : getMockLocations());
      setIsGeocoding(false);
    };

    parseMetaAdSets();
  }, [adSets, hasFetched]);

  // 4. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [SALON_REF.lat, SALON_REF.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Create layer group for dynamically drawn shapes
    const layersGroup = L.featureGroup().addTo(map);
    layersGroupRef.current = layersGroup;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 5. Update Layers dynamically when coordinates/selectedAdSet/theme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    // Clear previous layers
    layersGroup.clearLayers();

    // Set Map Tiles style based on Dark Mode
    const tileUrl = isDarkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    
    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(layersGroup);

    // Add Salon Marker (Indigo pulsing marker)
    const salonIcon = L.divIcon({
      html: `<div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 bg-indigo-500 rounded-full opacity-35 animate-ping"></div>
        <div class="relative w-6 h-6 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
          <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const salonMarker = L.marker([SALON_REF.lat, SALON_REF.lng], { icon: salonIcon })
      .bindPopup(`<div class="p-2 text-xs font-bold text-slate-800 dark:text-zinc-100">
        <p class="font-extrabold text-indigo-600 uppercase tracking-widest text-[9px] mb-0.5">Sede Aminna</p>
        <p>${SALON_REF.name}</p>
        <p class="text-[9.5px] font-normal text-slate-500 mt-1">Ponto de referência principal</p>
      </div>`);
    
    layersGroup.addLayer(salonMarker);

    // Draw targeting circles & points
    const drawBounds: L.LatLngBounds[] = [];

    geocodedLocations.forEach(loc => {
      const isSelected = selectedAdSetId ? loc.id.startsWith(selectedAdSetId) : false;
      const isAnySelected = selectedAdSetId !== null;
      
      // Determine colors & styling based on status and selection
      const color = loc.isActive 
        ? (isSelected ? '#6366f1' : '#4f46e5') 
        : '#94a3b8';
      
      const fillOpacity = isSelected ? 0.25 : (isAnySelected ? 0.04 : 0.12);
      const weight = isSelected ? 3 : (isAnySelected ? 1 : 1.8);
      const dashArray = loc.isActive ? undefined : '5, 5';

      // Circle layout targeting
      const circle = L.circle([loc.lat, loc.lng], {
        radius: loc.radiusMeters,
        color,
        weight,
        fillColor: color,
        fillOpacity,
        dashArray
      });

      // Bind dynamic tooltip/popup content
      const popupContent = `
        <div class="p-3 text-xs text-slate-800 max-w-[240px]">
          <p class="font-black text-[10px] text-indigo-600 uppercase tracking-wider mb-1">🎯 Segmentacão de Anúncio</p>
          <p class="font-black text-slate-900 leading-tight mb-2 uppercase">${loc.adSetName}</p>
          <div class="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 mb-2">
            <div>
              <p class="text-[8px] font-bold text-slate-400 uppercase leading-none">RAIO</p>
              <p class="font-black text-slate-800 mt-0.5">${(loc.radiusMeters / 1000).toFixed(1)} km</p>
            </div>
            <div>
              <p class="text-[8px] font-bold text-slate-400 uppercase leading-none">STATUS</p>
              <span class="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-0.5 ${
                loc.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }">${loc.isActive ? 'Ativo' : 'Pausado'}</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
            <div>
              <p class="text-[8px] font-bold text-slate-400 uppercase leading-none">INVESTIDO</p>
              <p class="font-black text-slate-800 mt-0.5">R$ ${loc.spend.toFixed(2)}</p>
            </div>
            <div>
              <p class="text-[8px] font-bold text-slate-400 uppercase leading-none">CLIQUES</p>
              <p class="font-black text-indigo-600 mt-0.5">${loc.clicks}</p>
            </div>
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);

      // Only draw circle on map if selected, OR if no adset is selected and it is local (<= 10km)
      const shouldDrawCircle = isSelected || (!isAnySelected && loc.isActive && loc.radiusMeters <= 10000);
      if (shouldDrawCircle) {
        layersGroup.addLayer(circle);
        if (loc.isActive) {
          drawBounds.push(circle.getBounds());
        }
      }

      // Checkmark icon matching Meta Ads Manager style
      const pinIcon = L.divIcon({
        html: `<div class="relative flex items-center justify-center group-marker">
          <div class="w-4.5 h-4.5 rounded-full ${
            loc.isActive 
              ? (isSelected ? 'bg-indigo-600 ring-4 ring-indigo-200/50' : 'bg-indigo-500') 
              : 'bg-slate-400'
          } border-2 border-white shadow-md flex items-center justify-center text-[7.5px] text-white font-extrabold cursor-pointer transition-all transform hover:scale-125">
            ✓
          </div>
        </div>`,
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const pinMarker = L.marker([loc.lat, loc.lng], { icon: pinIcon })
        .bindPopup(popupContent)
        .on('click', () => {
          setSelectedAdSetId(loc.id.split('-')[0]); // Focus clicked adset
        });
      
      layersGroup.addLayer(pinMarker);
    });

    // 6. Handle focus transitions
    if (selectedAdSetId) {
      const selectedLocs = geocodedLocations.filter(l => l.id.startsWith(selectedAdSetId));
      if (selectedLocs.length > 1) {
        const adSetBounds = L.latLngBounds(selectedLocs.map(l => [l.lat, l.lng]));
        map.fitBounds(adSetBounds, { padding: [60, 60], animate: true, duration: 1.2 });
      } else if (selectedLocs.length === 1) {
        map.setView([selectedLocs[0].lat, selectedLocs[0].lng], 13, { animate: true, duration: 1.2 });
      }
    } else if (drawBounds.length > 0) {
      // Auto-fit all active targeting regions inside viewport
      const mergedBounds = drawBounds.reduce((acc, bounds) => acc.extend(bounds));
      // Extend to include salon as well
      mergedBounds.extend([SALON_REF.lat, SALON_REF.lng]);
      map.fitBounds(mergedBounds, { padding: [40, 40], animate: true, duration: 1.0 });
    }
  }, [geocodedLocations, selectedAdSetId, isDarkMode]);

  // Calculate audit distances to verify targeting health
  const getAuditStatus = () => {
    const activePoints = geocodedLocations.filter(loc => loc.isActive);
    if (activePoints.length === 0) {
      return {
        label: "Sem Campanhas Ativas",
        desc: "Inicie campanhas para verificar a acurácia geográfica.",
        color: "text-slate-500 bg-slate-50 border-slate-200 dark:bg-zinc-800/40 dark:border-zinc-800",
        icon: Info
      };
    }

    // Measure distance of targeted points from salon
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const distances = activePoints.map(p => calculateDistance(SALON_REF.lat, SALON_REF.lng, p.lat, p.lng));
    const maxDistance = Math.max(...distances);

    if (maxDistance <= 8) {
      return {
        label: "Geolocalização Ideal",
        desc: "Excelente! Todo o investimento ativo está focado num raio hyper-local (até 8km do salão). Ideal para conversão física.",
        color: "text-emerald-700 bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-400",
        icon: CheckCircle
      };
    } else if (maxDistance <= 20) {
      return {
        label: "Geolocalização Regional",
        desc: "Cobertura regional ativa (até 20km). Certifique-se de que oferece repasse ou que os clientes costumam vir de longe para esta campanha.",
        color: "text-indigo-700 bg-indigo-50/50 border-indigo-200/50 dark:bg-indigo-950/20 dark:border-indigo-800/30 dark:text-indigo-400",
        icon: MapIcon
      };
    } else {
      return {
        label: "Alerta de Cobertura Ampla",
        desc: "Campanhas ativas cobrindo áreas distantes (mais de 20km do salão). Verifique se o custo de aquisição é viável para essas distâncias.",
        color: "text-amber-700 bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400",
        icon: AlertTriangle
      };
    }
  };

  const groupedAdSets = React.useMemo(() => {
    const groups: Record<string, {
      adSetId: string;
      adSetName: string;
      campaignName: string;
      spend: number;
      conversions: number;
      clicks: number;
      isActive: boolean;
      locations: TargetLocation[];
    }> = {};
    
    geocodedLocations.forEach(loc => {
      const adSetId = loc.id.split('-')[0];
      if (!groups[adSetId]) {
        groups[adSetId] = {
          adSetId,
          adSetName: loc.adSetName,
          campaignName: loc.campaignName,
          spend: loc.spend,
          conversions: loc.conversions,
          clicks: loc.clicks,
          isActive: loc.isActive,
          locations: [],
        };
      }
      const isDuplicate = groups[adSetId].locations.some(l => l.lat === loc.lat && l.lng === loc.lng && l.radiusMeters === loc.radiusMeters);
      if (!isDuplicate) {
        groups[adSetId].locations.push(loc);
      }
    });
    
    return Object.values(groups).sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  }, [geocodedLocations]);

  const audit = getAuditStatus();

  return (
    <div className={`transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 z-[9999] bg-white dark:bg-zinc-900 p-6 md:p-8 flex flex-col space-y-6 overflow-hidden' 
        : 'bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 shadow-sm p-4 sm:p-6 md:p-8 space-y-6'
    }`}>
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <Globe size={16} className="text-indigo-600 animate-spin-slow" /> Auditoria Geográfica do Tráfego Pago
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
            Veja exatamente onde seus anúncios estão aparecendo e garanta o orçamento na região certa
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          {adSets.length === 0 && (
            <span className="px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 flex items-center gap-1.5 border border-amber-200/40">
              <Info size={11} /> Visualização Demo
            </span>
          )}
          
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider border border-slate-200/20 dark:border-zinc-800"
            title={isFullscreen ? "Minimizar" : "Ver em tela cheia"}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{isFullscreen ? "Sair" : "Tela Cheia"}</span>
          </button>
        </div>
      </div>

      {/* Audit Banner */}
      <div className={`p-4 rounded-2xl border flex gap-3 items-start transition-all duration-300 flex-shrink-0 ${audit.color}`}>
        <audit.icon size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider">{audit.label}</p>
          <p className="text-[10px] font-medium leading-relaxed mt-1 opacity-90">{audit.desc}</p>
        </div>
      </div>

      {/* Main Grid Map + List */}
      <div className={`grid grid-cols-1 xl:grid-cols-3 gap-6 ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
        
        {/* Map Container */}
        <div className={`xl:col-span-2 relative rounded-3xl overflow-hidden border border-slate-100 dark:border-zinc-800/80 shadow-inner z-10 ${
          isFullscreen ? 'h-full' : 'h-[380px] sm:h-[450px]'
        }`}>
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {isGeocoding && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center">
              <div className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100 dark:border-zinc-800">
                <RefreshCw size={16} className="text-indigo-600 animate-spin" />
                <span className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest">Calculando Coordenadas Meta...</span>
              </div>
            </div>
          )}

          {/* Quick controls map overlays */}
          <div className="absolute top-4 left-4 z-[999] flex flex-col gap-2">
            <button 
              onClick={() => setSelectedAdSetId(null)}
              className="bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-[9px] font-black uppercase tracking-wider text-slate-800 dark:text-white px-3 py-2 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Navigation size={10} /> Recalibrar Foco Geral
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`xl:col-span-1 flex flex-col gap-4 ${isFullscreen ? 'min-h-0 h-full' : ''}`}>
          {/* AdSets Targeting List */}
          <div className={`flex flex-col gap-3 overflow-y-auto no-scrollbar pr-1 ${
            isFullscreen ? 'flex-1 min-h-0' : 'max-h-[380px] sm:max-h-[450px]'
          }`}>
            <div className="flex justify-between items-center px-1 mb-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Conjuntos de Anúncios</span>
              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">{groupedAdSets.length} Ativos</span>
            </div>

            {groupedAdSets.map((group) => {
              const isSelected = selectedAdSetId === group.adSetId;
              const matchingAds = ads.filter(ad => ad.adset_id === group.adSetId);
              
              return (
                <div
                  key={group.adSetId}
                  onClick={() => setSelectedAdSetId(isSelected ? null : group.adSetId)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none group text-left ${
                    isSelected 
                      ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800/40 shadow-sm' 
                      : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100 hover:border-slate-200 dark:bg-zinc-800/20 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase tracking-tight leading-snug ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>
                        {group.adSetName}
                      </p>
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-1 truncate leading-none">
                        Campanha: {group.campaignName}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      group.isActive 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                        : 'bg-slate-200 text-slate-600 dark:bg-zinc-700 dark:text-zinc-400'
                    }`}>
                      {group.isActive ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/40 dark:border-zinc-800/40">
                    <div>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase block tracking-wider">Investido</span>
                      <span className="text-[9.5px] font-black text-slate-700 dark:text-zinc-300">R$ {group.spend.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-black text-slate-400 uppercase block tracking-wider">Cliques</span>
                      <span className="text-[9.5px] font-black text-indigo-600 dark:text-indigo-400">{group.clicks || 0} cliques</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[7.5px] font-black text-slate-400 uppercase block tracking-wider">Áreas Foco</span>
                      <span className="text-[9.5px] font-black text-slate-700 dark:text-zinc-300">{group.locations.length} pinos</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-200/20 dark:border-zinc-800/20 text-[8.5px] font-bold text-slate-500">
                    <span className="flex items-center gap-1 uppercase tracking-tight">
                      <Globe size={9} className="text-indigo-500" /> Detalhes do Conjunto
                    </span>
                    <span className="flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 font-black uppercase">
                      {isSelected ? 'Ocultar' : 'Expandir'} <ChevronRight size={10} className={`transform transition-transform ${isSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                    </span>
                  </div>

                  {/* Expanded drill down content */}
                  {isSelected && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="mt-3.5 pt-3.5 border-t border-slate-200/60 dark:border-zinc-800/60 space-y-4 animate-fadeIn"
                    >
                      {/* Focos de Cobertura */}
                      <div className="space-y-1.5">
                        <p className="text-[7.5px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <MapPin size={8} /> Focos de Cobertura ({group.locations.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.locations.map((loc) => (
                            <button
                              key={loc.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (mapInstanceRef.current) {
                                  mapInstanceRef.current.setView([loc.lat, loc.lng], 13, { animate: true, duration: 1.0 });
                                }
                              }}
                              className="px-2 py-1 bg-white dark:bg-zinc-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-[8.5px] font-black border border-slate-100 dark:border-zinc-800/80 hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <Navigation size={8} className="text-indigo-500" />
                              <span className="truncate max-w-[120px]">{loc.name}</span>
                              <span className="opacity-60">({(loc.radiusMeters / 1000).toFixed(0)} km)</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Desempenho por Anúncio */}
                      {matchingAds.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[7.5px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <BarChart2 size={8} /> Desempenho por Anúncio ({matchingAds.length})
                          </p>
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5 no-scrollbar">
                            {matchingAds.map((ad: any) => (
                              <div 
                                key={ad.id} 
                                className="flex items-center justify-between p-1.5 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800/50 hover:border-indigo-100 dark:hover:border-indigo-950/40 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {ad.creative?.thumbnail_url ? (
                                    <img 
                                      src={ad.creative.thumbnail_url} 
                                      alt={ad.name}
                                      className="w-6 h-6 rounded object-cover border border-slate-100 dark:border-zinc-800 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                      <MapIcon size={10} className="text-slate-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-800 dark:text-zinc-200 truncate max-w-[110px] sm:max-w-[130px]">
                                      {ad.name}
                                    </p>
                                    <span className={`inline-block text-[6.5px] font-extrabold uppercase px-1 rounded-sm mt-0.5 ${
                                      ad.status === 'ACTIVE' 
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                        : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                                    }`}>
                                      {ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 pl-2">
                                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 block">
                                    {ad.clicks?.toLocaleString('pt-BR') || 0} clks
                                  </span>
                                  <span className="text-[7.5px] font-bold text-slate-400 block mt-0.5">
                                    R$ {ad.spend?.toFixed(0) || 0}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
