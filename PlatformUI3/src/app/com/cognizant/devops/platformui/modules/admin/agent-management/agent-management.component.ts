/*******************************************************************************
 * Copyright 2017 Cognizant Technology Solutions
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License.  You may obtain a copy
 * of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations under
 * the License.
 ******************************************************************************/
import { Component, OnInit } from '@angular/core';
import { AgentService } from '@insights/app/modules/admin/agent-management/agent-management-service';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, NavigationExtras, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { MessageDialogService } from '@insights/app/modules/application-dialog/message-dialog-service';

@Component({
  selector: 'app-agent-management',
  templateUrl: './agent-management.component.html',
  styleUrls: ['./agent-management.component.css', './../../home.module.css']
})
export class AgentManagementComponent implements OnInit {

  validationArr = {};
  showConfirmMessage: string;
  showList: boolean = false;
  showThrobber: boolean;
  showMessage: string;
  data = [];
  tableParams = [];
  buttonDisableStatus: boolean = true;
  runDisableStatus: string = "";
  agentListDatasource = [];
  displayedColumns: string[];
  selectedAgent: any;
  agentparameter = {};
  receivedParam: any;
  toolVersionData: any;
  versionList = [];

  constructor(public agentService: AgentService, public router: Router,
    private route: ActivatedRoute, public dialog: MatDialog,
    public messageDialog: MessageDialogService) {
    this.getRegisteredAgents();
  }

  ngOnInit() {
    //console.log(this.route.queryParams);
    this.route.queryParams.subscribe(params => {
      //console.log(params["agentstatus"]);
      if (params["agentstatus"] != undefined) {
        this.receivedParam = params["agentstatus"];
        var agentConfigstatusCode = params["agentConfigstatusCode"];
        var showConfirmMessage = this.receivedParam;
        //console.log(agentConfigstatusCode + " " + showConfirmMessage);
        if (agentConfigstatusCode == undefined) {
          agentConfigstatusCode = 'WARN';
        }
        setTimeout(() => this.messageDialog.showApplicationsMessage(showConfirmMessage, agentConfigstatusCode));
      }
    });
  }

  public async getRegisteredAgents() {

    var self = this;
    self.showList = false;
    self.showThrobber = true;
    self.buttonDisableStatus = true;
    self.runDisableStatus = "";
    let agentList = await self.agentService.loadAgentServices("DB_AGENTS_LIST");
    if (agentList != null && agentList.status == 'success') {
      this.agentListDatasource = agentList.data;
      //console.log(agentList);
      this.displayedColumns = ['radio', 'OS', 'ToolCategory', 'ToolName', 'Version', 'Status'];
      setTimeout(() => {
        this.showConfirmMessage = "";
      }, 3000);
    } else {
      self.showMessage = "Something wrong with Service, Please try again.";
      self.messageDialog.showApplicationsMessage("Something wrong with Service, Please try again.", "ERROR");
    }
  }
  private consolidatedArr(detailArr): void {
    var self = this;
    this.validationArr = {};
    for (var i = 0; i < detailArr.length; i++) {
      this.validationArr[i] = { "os": detailArr[i].osVersion, "version": detailArr[i].agentVersion, "tool": detailArr[i].toolName }
    }
  }

  statusEdit(element) {
    this.runDisableStatus = element.agentStatus;
    this.buttonDisableStatus = false;
  }

  agentStartStopAction(actType): void {
    var self = this;
    if (this.selectedAgent == undefined) {
      this.showConfirmMessage = "other";
      self.showMessage = "Please select Agent";
    } else {
      self.agentService.agentStartStop(this.selectedAgent.agentKey, actType)
        .then(function (data) {
          if (actType == "START") {
            if (data.status == "success") {
              self.messageDialog.showApplicationsMessage("Agent Started Successfully", "SUCCESS");
            } else {
              self.messageDialog.showApplicationsMessage("Agent Start failed,Please try again later", "ERROR");
            }
          } else {
            if (data.status == "success") {
              self.messageDialog.showApplicationsMessage("Agent Stopped Successfully", "SUCCESS");
            } else {
              self.messageDialog.showApplicationsMessage("Agent Stop failed,Please try again later", "ERROR");
            }
          }

          self.getRegisteredAgents();
        })
        .catch(function (data) {
          self.showConfirmMessage = "service_error";
          self.getRegisteredAgents();
        });
    }
  }

  async addAgentData() {
    this.agentparameter = JSON.stringify({ 'type': 'new', 'detailedArr': {} });
    let navigationExtras: NavigationExtras = {
      skipLocationChange: true,
      queryParams: {
        "agentparameter": this.agentparameter
      }
    };
    //console.log(navigationExtras);
    this.router.navigate(['InSights/Home/agentconfiguration'], navigationExtras);
  }

  async editAgent() {
    this.consolidatedArr(this.selectedAgent);
    this.agentparameter = JSON.stringify({ 'type': 'update', 'detailedArr': this.selectedAgent });
    let navigationExtras: NavigationExtras = {
      skipLocationChange: true,
      queryParams: {
        "agentparameter": this.agentparameter
      }
    };
    this.router.navigate(['InSights/Home/agentconfiguration'], navigationExtras);
  }

  uninstallAgent() {
    var self = this;
    //console.log("uninstall agent " + JSON.stringify(this.selectedAgent));
    if (self.selectedAgent.agentStatus == 'STOP') {
      var title = "Delete Agent";
      var dialogmessage = "Note: Uninstalling the Agent doesn't delete the data that has been collected. The agent could be re-registered again, and the data collection would be resumed from the last run time. <br> <br> Do you want to uninstall <b> " + self.selectedAgent.toolName + " </b> on <b>" + self.selectedAgent.osVersion + " </b> ? ";
      const dialogRef = self.messageDialog.showConfirmationMessage(title, dialogmessage, this.selectedAgent.toolName, "ALERT", "40%");

      dialogRef.afterClosed().subscribe(result => {
        //console.log('The dialog was closed  ' + result);
        if (result == 'yes') {
          self.agentService.agentUninstall(self.selectedAgent.agentKey, self.selectedAgent.toolName, self.selectedAgent.osVersion).then(function (data) {
            self.getRegisteredAgents();
          }).catch(function (data) {
            self.showConfirmMessage = "service_error";
            self.getRegisteredAgents();
          });
        }
      });
    } else {
      self.messageDialog.showApplicationsMessage("Please stop the Agent before uninstalling!", "WARN");
    }
  }
}
