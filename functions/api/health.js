import {BUILD_VERSION} from './catalog.js';
export function onRequestGet(){return Response.json({status:'ok',build:BUILD_VERSION,service:'HOTSEA Cloudflare Pages Functions'},{headers:{'Cache-Control':'no-store'}});}
