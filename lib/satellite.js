const TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const ODATA_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products';

async function getCopernicusToken() {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.COPERNICUS_CLIENT_ID,
      client_secret: process.env.COPERNICUS_CLIENT_SECRET
    })
  });
  const data = await resp.json();
  return data.access_token;
}

// bbox: [min_lng, min_lat, max_lng, max_lat]
export async function findLatestSentinel2(bbox, maxCloud = 20, daysBack = 30) {
  const dateFrom = new Date(Date.now() - daysBack * 86400000).toISOString();
  const dateTo   = new Date().toISOString();
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const footprint = `POLYGON((${minLng} ${minLat},${maxLng} ${minLat},${maxLng} ${maxLat},${minLng} ${maxLat},${minLng} ${minLat}))`;

  const params = new URLSearchParams({
    '$filter': `Collection/Name eq 'SENTINEL-2' and Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/OData.CSC.DoubleAttribute/Value le ${maxCloud}) and ContentDate/Start gt ${dateFrom} and ContentDate/Start lt ${dateTo} and OData.CSC.Intersects(area=geography'SRID=4326;${footprint}')`,
    '$orderby': 'ContentDate/Start desc',
    '$top': '1',
    '$expand': 'Attributes'
  });

  const resp = await fetch(`${ODATA_URL}?${params}`);
  const data = await resp.json();
  if (!data.value?.length) return null;

  const p = data.value[0];
  return {
    product_id:    p.Id,
    product_name:  p.Name,
    image_date:    p.ContentDate?.Start,
    cloud_cover:   p.Attributes?.find(a => a.Name === 'cloudCover')?.Value,
    download_url:  `https://download.dataspace.copernicus.eu/odata/v1/Products(${p.Id})/$value`,
    thumbnail_url: `https://catalogue.dataspace.copernicus.eu/odata/v1/Assets(${p.Id})/Nodes/$value`
  };
}
