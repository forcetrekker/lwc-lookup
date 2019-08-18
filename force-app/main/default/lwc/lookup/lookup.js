import { LightningElement, track, api, wire } from 'lwc';
import findRecords from '@salesforce/apex/LookupController.findRecords';
import findObjectSchema from '@salesforce/apex/LookupController.findObjectSchema';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

/** The delay used when debouncing event handlers before invoking Apex. */
const DELAY = 300;
let isRunOnce = false;

export default class Lookup extends LightningElement {

    // attributes
    @api objectname;
    @api keyfieldapiname;
    @api additionalField;
    @api autoselectsinglematchingrecord = false;
    @api lookupLabel;
    @api lookupPlaceholder;
    @api invalidOptionChosenMessage;
    @api isMultiSelect;

    // reactive private properties
    @track searchKey = '';
    @track records;
    @track error;
    @track selectedRecordId;
    @track disabledInput;
    @track placeholderLabel = "Search";
    @track searchLabel;
    @track themeInfo;
    @track items = [];


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
            // console.log("Labels retrieved..");

            this.validateAttributes(objectInformation);
        }
        if(error) {

            let message = "You do not have the rights to object or object api name is invalid: " + this.objectname;
            if(error.statusText === "INVALID_TYPE" && !isRunOnce) {
                this.isRunOnce = true;
                // this.objectname = 'Contact';
                // this.keyfieldapiname = 'Name';
                this.callFindObjectSchema();
            } else {
                this.showError(error.body && error.body.length > 0 ? error.body[0].message : message);
                this.disabledInput = true;
            }
        }
    }

    callFindObjectSchema() {
        findObjectSchema({ 
            "objectApiName": this.objectname,
            "keyField": this.keyfieldapiname
        }).then(result => {
            let objectname = this.objectname;
            let keyfieldapiname = this.keyfieldapiname;

            if(result && result.objectList && result.objectList.length > 0) {
                this.objectname = result.objectList[0].key;
                this.keyfieldapiname = 'Name';
            } else {
                this.error = 'Some error occured'; 
            }
            
            console.log("result", JSON.stringify(result));

        })
        .catch(error => {
            this.error = error;
        });
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

        // copy the reference of properties locally to make them available for timeout
        let searchKey = event.target.value;
        let selectedRecordId = this.selectedRecordId;
        let records = this.records;
        // timeout is added to avoid showing error when user selects a result
        setTimeout(() => {

            // console.log("before event.target.value", searchKey, selectedRecordId);

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

                if(this.isMultiSelect) {
                    this.searchKey = "";
                    this.records = [];
                }
                // console.log("inside blur timeout", this.searchKey, this.selectedRecordId);
                this.toggleError();
            }
        }, 200);
    }

    queryRecords() {
        // console.log("you typed: " + this.searchKey);
        var setSelectedRecords = this.isMultiSelect ? this.items.map((item) => item.Id) : [];
        // console.log("setSelectedRecords", JSON.stringify(setSelectedRecords));
        findRecords({ 
            "searchKey": this.searchKey,
            "objectApiName": this.objectname,
            "keyField": this.keyfieldapiname,
            "additionalField": this.additionalField,
            "selectedRecords": JSON.stringify(setSelectedRecords) 
        }).then(result => {
            let keyfieldapiname = this.keyfieldapiname;
            let additionalField = this.additionalField;
            // console.log("this.keyfieldapiname", keyfieldapiname);
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
            // console.log("this.records", JSON.stringify(this.records));

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
        if(!this.isMultiSelect) {
            // todo: do something about it, need to fix the text not meta
            
            let searchKeyword = '';
            if(this.selectedRecordId) {
                let record = this.records.find(eachRecord => eachRecord.Id === this.selectedRecordId);
                if(record && record.Id) {
                    searchKeyword = record.text;
                }

            }
            this.searchKey = searchKeyword;
            
        }
        // console.log("selectedRecordId", this.selectedRecordId);
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
            if(this.selectedRecordId && record) {
                this.items.push(record);
            }

            const searchKeyword = this.selectedRecordId ? record.text : "";
            const eventData = {"detail": { "record": record, "searchKey": searchKeyword }};
            const selectedEvent = new CustomEvent('selected', eventData);
            // console.log("sending event", JSON.stringify(eventData));
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
        // console.log("color", color);
        return color;
    }

    get noRecordFound() {
        return this.searchKey && (this.records && this.records.length === 0);
    }

    get showMessage() {
        return this.selectedRecordId && this.searchKey;
    }

    get displayMultipleOption() {
        return this.isMultiSelect && this.items;
    }

    handleItemRemove(event) {

        // clear record selected message
        this.setRecordId("");

        const index = event.detail.index ? event.detail.index : event.detail.name;
        const _item = this.items;
        _item.splice(index, 1);
        // shallow copy of the variable to track
        this.items = [..._item];
    }
}