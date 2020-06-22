'use strict';
const AWS = require('aws-sdk');
const { IncomingWebhook } = require('@slack/webhook');

module.exports.panopticon = async (event, context, callback) => {
    const webhook = new IncomingWebhook(process.env.SLACK_URL);
    // const webhook = new IncomingWebhook('https://hooks.slack.com/services/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');
    // const ec2 = new AWS.EC2();

    let ipPermission;
    if(typeof(event.requestParameters.ipPermissions) === 'undefined'){
        ipPermission = '';
    }else {
        ipPermission = event.requestParameters.ipPermissions.items;
    }

    let eventInfo = {
        "eventName": event.eventName,
        "eventTime": event.eventTime,
        "accountId": event.userIdentity.accountId,
        "userName": event.userIdentity.userName,
        "sourceIp": event.sourceIPAddress,
        "awsRegion": event.awsRegion,
        "sgId": `${typeof (event.requestParameters.groupId) === 'undefined' ? event.responseElements.groupId : event.requestParameters.groupId }`,
        "ipPermissions": ipPermission
    }

    function formatMessage(eventName){
        let thumbnailImage = '';
        let eventNameDetail = '';
        let emoji = '';
        let ipList = [];
        let ipListMessage = {};
        const createImage = 'https://img.icons8.com/color/48/000000/new-by-copy.png';
        const editImage = 'https://img.icons8.com/color/48/000000/edit-property.png';
        const deleteImage = 'https://img.icons8.com/color/48/000000/delete-property.png';

        switch(eventName){
            case 'CreateSecurityGroup': 
                thumbnailImage = createImage; 
                eventNameDetail = '보안그룹 생성';
                break;
            case 'DeleteSecurityGroup': 
                thumbnailImage = deleteImage; 
                eventNameDetail = '보안그룹 삭제';
                break;
            case 'AuthorizeSecurityGroupEgress':
            case 'AuthorizeSecurityGroupIngress':
                thumbnailImage = editImage;
                eventNameDetail = '보안그룹 IP 상세 수정';
                emoji = ':white_check_mark:';
                ipListMessage = 
                                {
                                    "type": "section",
                                    "text": {
                                        "type": "mrkdwn",
                                        "text": "*Security Group Ip Permissions*"
                                    },
                                    "fields": 
                                        ipList
                                }
                break;
            case 'RevokeSecurityGroupEgress':
            case 'RevokeSecurityGroupIngress': 
                thumbnailImage = editImage; 
                emoji = ':x:';
                eventNameDetail = '보안그룹 IP 상세 수정';
                ipListMessage = {
                                    "type": "section",
                                    "text": {
                                        "type": "mrkdwn",
                                        "text": "*Security Group Ip Permissions*"
                                    },
                                    "fields": 
                                        ipList
                                }
                break;
        };
        for(const item of eventInfo.ipPermissions){
            let ipItself = [];
            let ipDesc = [];
            for (const info of item.ipRanges.items) {
                if(info.hasOwnProperty("cidrIp")){
                    ipItself.push(info["cidrIp"]);
                    ipDesc.push(info["description"]);
                }else if(info.hasOwnProperty("groupId")){
                    ipItself.push(info["groupId"]);
                    ipDesc.push(info["description"]);
                }
            }
            let ipMessage = {
                "type": "plain_text",
                "text": `Protocol : ${item.ipProtocol}\nIP : ${item.fromPort} - ${item.toPort}\nSource : ${ipItself.join("\n")}\nDescription : ${ipDesc.join("\n")}`,
                "emoji": true
            }
            ipList.push(ipMessage);
        }

        let slackText = {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `${emoji} SecurityGroup 변경 사항 발생 *(${eventInfo.eventName})*`
                    }
                }, 
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*EventName :*\n${eventInfo.eventName}\n(${eventNameDetail})\n*Account Id :*\n${eventInfo.accountId}\n*EventTime :*\n${eventInfo.eventTime}\n*Source IP :*\n${eventInfo.sourceIp}  \n*User Name :*\n ${eventInfo.userName}\n*AWS Region :*\n${eventInfo.awsRegion}\n*Security Group ID :*\n${eventInfo.sgId}`
                    },
                    "accessory": {
                        "type": "image",
                        "image_url": `${thumbnailImage}`,
                        "alt_text": "status thumbnail"
                    }
                    
                },
                {
                    "type": "divider"
                 }

            ]
        }
        if(Object.keys(ipListMessage).length > 0){
            slackText["blocks"].push(ipListMessage);
        }
        return slackText;
        
    }


    (async() => {
        const message = await formatMessage(eventInfo.eventName);
        await webhook.send(message);

    })();

}
