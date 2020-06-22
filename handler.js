'use strict';
const {
    IncomingWebhook
} = require('@slack/webhook');

module.exports.panopticon = async (event, context, callback) => {
    const webhook = new IncomingWebhook(process.env.SLACK_URL);

    let ipPermission;
    if (typeof (event.detail.requestParameters.ipPermissions) === 'undefined') {
        ipPermission = '';
    } else {
        ipPermission = event.detail.requestParameters.ipPermissions.items;
    }

    let eventInfo = {
        "eventName": event.detail.eventName,
        "eventTime": event.detail.eventTime,
        "accountId": event.detail.userIdentity.accountId,
        "userName": event.detail.userIdentity.userName,
        "sourceIp": event.detail.sourceIPAddress,
        "awsRegion": event.detail.awsRegion,
        "sgId": `${typeof (event.detail.requestParameters.groupId) === 'undefined' ? event.detail.responseElements.groupId : event.detail.requestParameters.groupId }`,
        "ipPermissions": ipPermission
    };

    function formatMessage(eventName) {
        let thumbnailImage = '';
        let eventNameDetail = '';
        let emoji = '';
        let ipList = [];
        let ipListMessage = {};
        const createImage = 'https://img.icons8.com/color/48/000000/new-by-copy.png';
        const editImage = 'https://img.icons8.com/color/48/000000/edit-property.png';
        const deleteImage = 'https://img.icons8.com/color/48/000000/delete-property.png';

        switch (eventName) {
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
                ipListMessage = {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Security Group Ip Permissions*"
                    },
                    "fields": ipList
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
                    "fields": ipList
                }
                break;
        }

        for (const item of eventInfo.ipPermissions) {
            let ipItself = [];
            let ipDesc = [];

            if (item.ipRanges.hasOwnProperty("items")) {
                for (const iprangeInfo of item.ipRanges.items) {
                    ipItself.push(iprangeInfo["cidrIp"]);
                    ipDesc.push(typeof (iprangeInfo["description"]) === 'undefined' ? '' : iprangeInfo["description"]);
                }
            } else if (item.groups.hasOwnProperty("items")) {
                for (const groupInfo of item.groups.items) {
                    ipItself.push(groupInfo["groupId"]);
                    ipDesc.push(typeof (groupInfo["description"]) === 'undefined' ? '' : groupInfo["description"]);
                }
            } else if (item.prefixListIds.hasOwnProperty("items")) {
                for (const prefixInfo of item.prefixListIds.items) {
                    ipItself.push(prefixInfo["prefixListIds"]);
                    ipDesc.push(typeof (prefixInfo["description"]) === 'undefined' ? '' : prefixInfo["description"]);
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
            "blocks": [{
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
        if (Object.keys(ipListMessage).length > 0) {
            slackText["blocks"].push(ipListMessage);
        }
        return slackText;
    }

    const message = formatMessage(eventInfo.eventName);
    await webhook.send(message);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: event
        }, null, 2)
    }
};
