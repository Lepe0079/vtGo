export namespace main {
	
	export class Album {
	    title: string;
	    vtName: string;
	    thumbnail?: string;
	    platforms: string[];
	    year: string;
	    link: string;
	
	    static createFrom(source: any = {}) {
	        return new Album(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.vtName = source["vtName"];
	        this.thumbnail = source["thumbnail"];
	        this.platforms = source["platforms"];
	        this.year = source["year"];
	        this.link = source["link"];
	    }
	}
	export class TrackLinks {
	    ref: string;
	    download?: string;
	
	    static createFrom(source: any = {}) {
	        return new TrackLinks(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ref = source["ref"];
	        this.download = source["download"];
	    }
	}
	export class Track {
	    title: string;
	    links: TrackLinks;
	
	    static createFrom(source: any = {}) {
	        return new Track(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.links = this.convertValues(source["links"], TrackLinks);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AlbumData {
	    name: string;
	    albumArt: string[];
	    tracks: Track[];
	
	    static createFrom(source: any = {}) {
	        return new AlbumData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.albumArt = source["albumArt"];
	        this.tracks = this.convertValues(source["tracks"], Track);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ApiResponse___main_Album_ {
	    success: boolean;
	    data: Album[];
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new ApiResponse___main_Album_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.data = this.convertValues(source["data"], Album);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ApiResponse_main_AlbumData_ {
	    success: boolean;
	    data: AlbumData;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new ApiResponse_main_AlbumData_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.data = this.convertValues(source["data"], AlbumData);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class BookmarkedAlbum {
	    vtName: string;
	    name: string;
	    thumbnail?: string;
	    bookmarkedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new BookmarkedAlbum(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.vtName = source["vtName"];
	        this.name = source["name"];
	        this.thumbnail = source["thumbnail"];
	        this.bookmarkedAt = source["bookmarkedAt"];
	    }
	}
	export class DownloadedAlbum {
	    vtName: string;
	    name: string;
	    thumbnail?: string;
	    downloadedAt: number;
	    lastDownloadedAt: number;
	    trackCount: number;
	    downloadedTrackUrls: string[];
	
	    static createFrom(source: any = {}) {
	        return new DownloadedAlbum(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.vtName = source["vtName"];
	        this.name = source["name"];
	        this.thumbnail = source["thumbnail"];
	        this.downloadedAt = source["downloadedAt"];
	        this.lastDownloadedAt = source["lastDownloadedAt"];
	        this.trackCount = source["trackCount"];
	        this.downloadedTrackUrls = source["downloadedTrackUrls"];
	    }
	}
	export class SearchHistoryItem {
	    query: string;
	    timestamp: number;
	
	    static createFrom(source: any = {}) {
	        return new SearchHistoryItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.query = source["query"];
	        this.timestamp = source["timestamp"];
	    }
	}
	

}

