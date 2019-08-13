import { LightningElement, track, api } from 'lwc';

export default class LookupContainer extends LightningElement {
    @api cardTitle;
    @api objectname;
    @api keyfieldapiname;
    @api additionalField;
    @api autoselectsinglematchingrecord;
    @api lookupLabel;
    @api invalidOptionChosenMessage;
    @track record;
    @track searchKey;
    recordSelected(event) {
        let detail = event.detail;
        this.record = detail.record;
        this.searchKey = detail.searchKey;
        // console.log("receiving event", JSON.stringify(this.record), this.searchKey);
    }
}