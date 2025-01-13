import { v4 as uuidv4 } from 'uuid';

export default class Repair {
    constructor(repairData) {
        this.userID = repairData.userID;
        this.clientName = repairData.clientName;
        this.repairID = `repair-${uuidv4().slice(-8)}`;
        this.createdAt = new Date();
        this.status = "RECEIVING";
        this.description = repairData.description;
        this.promiseDate = repairData.promiseDate;
        this.metalType = repairData.metalType;
        this.repairTasks = repairData.repairTasks;
        this.cost = repairData.cost;
        this.picture = repairData.picture;
        this.notes = "";
        this.parts = [];
    }
}