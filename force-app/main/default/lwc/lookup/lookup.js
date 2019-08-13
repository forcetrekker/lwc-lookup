import { LightningElement, track, api, wire } from 'lwc';
import findRecords from '@salesforce/apex/LookupController.findRecords';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

/** The delay used when debouncing event handlers before invoking Apex. */
const DELAY = 300;
const debugmode = false;

export default class Lookup extends LightningElement {

    // attributes
    @api objectname;
    @api keyfieldapiname;
    @api additionalField;
    @api autoselectsinglematchingrecord = false;
    @api lookupLabel;
    @api lookupPlaceholder;
    @api invalidOptionChosenMessage;

    // reactive private properties
    @track searchKey = '';
    @track records;
    @track error;
    @track selectedRecordId;
    @track disabledInput;
    @track placeholderLabel = "Search";
    @track searchLabel;
    @track themeInfo;

    @wire(getObjectInfo, { objectApiName: "$objectname" })
    handleResult({error, data}) {
        if(data) {

            let objectInformation = data;

            if(this.lookupPlaceholder) {
                this.placeholderLabel = this.lookupPlaceholder;
            } else {
                this.placeholderLabel += " " + (objectInformation && objectInformation.labelPlural ?
                    objectInformation.labelPlural : '');
            }
            this.searchLabel = this.lookupLabel || objectInformation.label;
            this.themeInfo = objectInformation.themeInfo || {};
            this.debug("Labels retrieved..");

            this.validateAttributes(objectInformation);
        }
        if(error) {
            this.showError("You do not have the rights to object or object api name is invalid: " + this.objectname);
            this.disabledInput = true;
        }
    }

    // validate the name and additional fields
    validateAttributes(objectInformation) {
        let fields = objectInformation.fields;

        // convert the fields to map of lower case with regular casing API name
        let fieldsMap = new Map(Object.keys(fields).map(i => [i.toLowerCase(), i]))
         
        // validate if the API name is valid otherwise show and error
        if(this.keyfieldapiname && fieldsMap.has(this.keyfieldapiname.toLowerCase())) {
            // copy proper casing of API name
            this.keyfieldapiname = fieldsMap.get(this.keyfieldapiname.toLowerCase());
        } else {
            this.disabledInput = true;
            this.showError("Invalid field api name is passed - " + this.keyfieldapiname);
        }
        
        if(this.additionalField) {
            // validate the additional field in case its filled in
            if(fieldsMap.has(this.additionalField.toLowerCase())) {
                this.additionalField = fieldsMap.get(this.additionalField.toLowerCase());
            } else {
                this.disabledInput = true;
                this.showError("Invalid field api name for additional field is passed - " + this.additionalField);
            }
        }
    }

    handleKeyChange(event) {
        this.setRecordId("");
        // Debouncing this method: Do not update the reactive property as long as this function is
        // being called within a delay of DELAY. This is to avoid a very large number of Apex method calls.
        window.clearTimeout(this.delayTimeout);
        const searchKey = event.target.value;
        this.delayTimeout = setTimeout(() => {
            this.searchKey = searchKey;
            this.queryRecords();
        }, DELAY);
    }

    handleBlur(event) {
        this.debug("before event.target.value", event.target.value, this.selectedRecordId);

        // copy the reference of properties locally to make them available for timeout
        let searchKey = event.target.value;
        let selectedRecordId = this.selectedRecordId;
        let records = this.records;
        // timeout is added to avoid showing error when user selects a result
        setTimeout(() => {
            if(this.searchKey) {
                // when single records is available, select it
                if(this.autoselectsinglematchingrecord && this.records && this.records.length === 1) {
                    this.setRecordId(records[0].Id);
                    this.searchKey = records[0].Name;
                    this.records = [];
                }
                // clear out records when user types a keyword, does not select any record and clicks away
                if(!this.selectedRecordId && this.searchKey) {
                    this.records = [];
                }
                this.debug("inside blur timeout", this.searchKey, this.selectedRecordId);
                this.toggleError();
            }
        }, 200);
    }

    queryRecords() {
        this.debug("you typed: " + this.searchKey);
        findRecords({ "searchKey": this.searchKey,
            "objectApiName": this.objectname,
            "keyField": this.keyfieldapiname,
            "additionalField": this.additionalField} )
            .then(result => {
                let keyfieldapiname = this.keyfieldapiname;
                let additionalField = this.additionalField;
                this.debug("this.keyfieldapiname", keyfieldapiname);
                let records = [];
                result.forEach(function(eachResult) {

                    // prepare the JSON data
                    let record = {
                        "Id": eachResult.Id,
                        "text": eachResult[keyfieldapiname]
                    };
                    if(additionalField) {
                        record.meta = eachResult[additionalField];
                    }
                    records.push(record);
                });
                this.records = records;
                this.debug("this.records", JSON.stringify(this.records));

                this.toggleError();
            })
            .catch(error => {
                this.error = error;
            });
    }

    toggleError() {
        let message = !this.selectedRecordId && this.searchKey && (this.records && this.records.length === 0) ?
        (this.invalidOptionChosenMessage || "An invalid option has been chosen.") : "";
        this.showError(message);
    }

    showError(message) {
        let searchInput = this.template.querySelector(".searchInput");
        searchInput.setCustomValidity(message);
        searchInput.reportValidity();
    }

    onResultClick(event) {
        this.setRecordId(event.currentTarget.dataset.recordId);
        this.searchKey = event.target.innerText;
        this.debug("selectedRecordId", this.selectedRecordId);
        this.records = [];
        this.template.querySelector(".searchInput").focus();
    }

    setRecordId(recordId) {
        if(this.selectedRecordId !== recordId) {
            this.selectedRecordId = recordId;

            let record = {};
            if(this.records) {
                record = this.records.find(c => c.Id === recordId) || {};
            }
            const searchKeyword = this.selectedRecordId ? record.text : "";
            const eventData = {"detail": { "record": record, "searchKey": searchKeyword }};
            const selectedEvent = new CustomEvent('selected', eventData);
            this.debug("sending event", JSON.stringify(eventData));
            this.dispatchEvent(selectedEvent);
        }
    }

    get comboBoxClass() {
        let className = (this.records && this.records.length ? "slds-is-open" : "");
        return "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click " + className;
    }

    get iconColor() {
        let color = "background-color: " +
            (this.themeInfo && this.themeInfo.color ?
                ("#" + this.themeInfo.color) : "") +
            ";";
        this.debug("color", color);
        return color;
    }

    get noRecordFound() {
        return this.searchKey && (this.records && this.records.length === 0);
    }

    get showMessage() {
        return this.selectedRecordId && this.searchKey;
    }

    debug(message) {
        if(this.debugmode === true) {
            console.log(message);
        }
    }
}