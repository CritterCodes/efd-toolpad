import { CrudService } from './materials/crud.service';
import { SyncService } from './materials/sync.service';
import { StullerService } from './materials/stuller.service';
export default class MaterialsFacade { crud = new CrudService(); sync = new SyncService(); stuller = new StullerService(); }