import { LightningElement, track, api } from 'lwc';

export default class LookupContainer extends LightningElement {
    @api cardTitle;
    @api objectname;
    @api keyfieldapiname;
    @track contact;
    @track searchKey;
    contactSelected(event) {
        let detail = event.detail;
        this.contact = detail.contact;
        this.searchKey = detail.searchKey;
        // console.log("receiving event", JSON.stringify(this.contact), this.searchKey);
    }
}