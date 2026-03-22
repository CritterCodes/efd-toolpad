
import { useRepairPhotos } from './useRepairPhotos';
import { useRepairPricing } from './useRepairPricing';
import { useRepairValidation } from './useRepairValidation';
export const useNewRepair = () => {
    const photos = useRepairPhotos();
    const pricing = useRepairPricing();
    const validation = useRepairValidation();
    return { ...photos, ...pricing, ...validation };
}
