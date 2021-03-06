const Queue = require('rethinkdb-job-queue')
var Base64 = require('js-base64').Base64;

const axios = require('axios')
const _ = require('lodash');
const qOptions = {
    name: 'Metalsmith',
    // concurrency: 5 // The queue and table name
}
const gitlabtoken=process.env.gitlabtoken
const cxnOptions = {
    host: process.env.RDB_HOST,
    port: process.env.RDB_PORT,
    db: 'JobQueue' // The name of the database in RethinkDB
}
let d = new Date();
const webRootPath = process.env.webRootPath;
//console.log('====' + webRootPath);
const metalSourcePath = webRootPath + 'node_modules/';
const websitePath = webRootPath + 'websites/';
let responseConfig
let rawConfigs

const q = new Queue(cxnOptions, qOptions)
let config;
let arrayofrepopages=[]
let arrayofpages=[]
// let buildpayload='{ "branch": "master","commit_message": "publishing", "actions": '+arrayofpages+' }'
let websitename;
let websiteid;
let logfile = '';
let userId;
function getJobs() {

    q.process(async(job, next, onCancel) => {

        try {
            console.log('starting job:',job.id)
            userId=job.userId;
            arrayofrepopages=[]
            arrayofpages=[]
            if(job.websitejobqueuedata.RepojsonData.gitlabconfig!=undefined){
            let getrepolisting;
            let count=1
            do{
            getrepolisting= await axios.get('https://gitlab.com/api/v4/projects/'+job.websitejobqueuedata.RepojsonData.gitlabconfig.projectid+'/repository/tree?page='+count,{
              headers:{
                'PRIVATE-TOKEN': gitlabtoken
              }
             })
             arrayofrepopages=arrayofrepopages.concat(getrepolisting.data)
             count=count+1
            }while(getrepolisting.data.length==20)
            }
            
            // console.log('arrayofrepopages:',arrayofrepopages)
            logfile = '\n\n#######################################################################\n\n\t'+"["+d+"]:-"+'Publish starting for Website:' + job.websitejobqueuedata.RepojsonData.websiteName + '\n\n\t'+"["+d+"]:-"+'userID:' + job.websitejobqueuedata.RepojsonData.userId + '\n\n\t'+"["+d+"]:-"+'Starting Publish...\n'
            websitename = job.websitejobqueuedata.RepojsonData.websiteName;
            websiteid = job.websitejobqueuedata.RepojsonData.id
            let checkcancel = true;
            onCancel(job, () => {
                    // Gracefully stop your job here\
                    checkcancel = false;
                })
                // Do something with your result
            responseConfig = job.websitejobqueuedata.RepojsonData
            rawConfigs = responseConfig.configData;
            config = {
                metalpath: metalSourcePath,
                baseURL: job.websitejobqueuedata.baseURL
            }

            let folderUrl = websitePath + job.userId + '/' + job.websiteId + '/.temppublish'
                //let folderUrl = rawConfigs[0].repoSettings[0].BaseURL + '/.temppublish'
            let partialstotal = []
            let pageSeoTitle;
            let externalJs = rawConfigs[1].projectSettings[1].ProjectExternalJs;
            let externalCss = rawConfigs[1].projectSettings[1].ProjectExternalCss;
            let metaInfo = rawConfigs[1].projectSettings[1].ProjectMetaInfo;
            let ProjectMetacharset = rawConfigs[1].projectSettings[1].ProjectMetacharset
            let projectscripts = rawConfigs[1].projectSettings[1].ProjectScripts
            let projectstyles = rawConfigs[1].projectSettings[1].ProjectStyles
            let projectseotitle = rawConfigs[1].projectSettings[0].ProjectSEOTitle;
            let ProjectFaviconName = rawConfigs[1].projectSettings[0].BrandLogoName
            let favicon = ''
            let SeoTitle = ''
            let getFromBetween = {
                results: [],
                string: "",
                getFromBetween: function(sub1, sub2) {
                    if (this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
                    var SP = this.string.indexOf(sub1) + sub1.length;
                    var string1 = this.string.substr(0, SP);
                    var string2 = this.string.substr(SP);
                    var TP = string1.length + string2.indexOf(sub2);
                    return this.string.substring(SP, TP);
                },
                removeFromBetween: function(sub1, sub2) {
                    if (this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
                    var removal = sub1 + this.getFromBetween(sub1, sub2) + sub2;
                    this.string = this.string.replace(removal, "");
                },
                getAllResults: function(sub1, sub2) {
                    if (this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return;
                    var result = this.getFromBetween(sub1, sub2);
                    this.results.push(result);
                    this.removeFromBetween(sub1, sub2);
                    if (this.string.indexOf(sub1) > -1 && this.string.indexOf(sub2) > -1) {
                        this.getAllResults(sub1, sub2);
                    } else return;
                },
                get: function(string, sub1, sub2) {
                    this.results = [];
                    this.string = string;
                    this.getAllResults(sub1, sub2);
                    return this.results;
                }
            };
            let loadingText
            logfile = logfile + '\n\t'+"["+d+"]:-"+'Number of pages to Publish :' + rawConfigs[1].pageSettings.length


            for (let i = 0; i < rawConfigs[1].pageSettings.length; i++) {
                logfile = logfile + '\n\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n'
                if (checkcancel == false) {
                    // console.log('cancelling current')
                    logfile = logfile + '\n\t'+"["+d+"]:-"+'Cancelling Publish'
                    break
                    // return next()
                }
                loadingText=''
                // job.updateProgress(Math.ceil(((i + 1) / rawConfigs[1].pageSettings.length) * 100)).catch(err => console.error(err))
                // loadingText = ((i / rawConfigs[1].pageSettings.length) * 100).toFixed(0) + '% Done.' + 'Now publishing ' + rawConfigs[1].pageSettings[i].PageName + ' page.';
                loadingText=Math.ceil(((i + 1) / rawConfigs[1].pageSettings.length) * 100)
                await axios.patch(config.baseURL + '/jobqueue', {
                    'Status': 'progress',
                    'Percentage': loadingText,
                    'websiteName': websitename,
                    'websiteid': websiteid,
                    'userId':userId
                }).catch((e) => {
                    console.log(e)
                })
                let tophead = '';
                let endhead = '';
                let topbody = '';
                let endbody = '';
                if (projectseotitle != undefined && projectseotitle != '') {
                    SeoTitle = projectseotitle
                }
                if (ProjectFaviconName != undefined && ProjectFaviconName != '' && ProjectFaviconName != '!!!No file uploaded!!!') {

                    favicon = ' <link rel="icon" type="image/png" href="./favicon.' + ProjectFaviconName.split('.')[1] + '">'
                }

                if (ProjectMetacharset != undefined && ProjectMetacharset != '') {
                    tophead = tophead + '<meta charset="' + ProjectMetacharset + '">'
                }

                if (metaInfo != undefined && metaInfo.length > 0) {
                    for (let a = 0; a < metaInfo.length; a++) {

                        if ((metaInfo[a].name != '' && metaInfo[a].name.trim().length > 0) && (metaInfo[a].content != '' && metaInfo[a].content.trim().length > 0)) {
                            tophead = tophead + '<meta name="' + metaInfo[a].name + '" content="' + metaInfo[a].content + '">'
                        }
                    }
                }

                if (externalJs != undefined && externalJs.length > 0) {
                    for (let a = 0; a < externalJs.length; a++) {
                        if (externalJs[a].linkposition == 'starthead' && externalJs[a].linkurl.trim().length > 0) {
                            tophead = tophead + '<script src="' + externalJs[a].linkurl + '"><\/script>'
                        } else if (externalJs[a].linkposition == 'endhead' && externalJs[a].linkurl.trim().length > 0) {
                            endhead = endhead + '<script src="' + externalJs[a].linkurl + '"><\/script>'
                        } else if (externalJs[a].linkposition == 'startbody' && externalJs[a].linkurl.trim().length > 0) {
                            topbody = topbody + '<script src="' + externalJs[a].linkurl + '"><\/script>'
                        } else if (externalJs[a].linkposition == 'endbody' && externalJs[a].linkurl.trim().length > 0) {
                            endbody = endbody + '<script src="' + externalJs[a].linkurl + '"><\/script>'
                        }
                    }
                }

                if (externalCss != undefined && externalCss.length > 0) {
                    for (let a = 0; a < externalCss.length; a++) {
                        if (externalCss[a].linkposition == 'starthead' && externalCss[a].linkurl.trim().length > 0) {
                            tophead = tophead + '<link rel="stylesheet" type="text/css" href="' + externalCss[a].linkurl + '">'
                        } else if (externalCss[a].linkposition == 'endhead' && externalCss[a].linkurl.trim().length > 0) {
                            endhead = endhead + '<link rel="stylesheet" type="text/css" href="' + externalCss[a].linkurl + '">'
                        } else if (externalCss[a].linkposition == 'startbody' && externalCss[a].linkurl.trim().length > 0) {
                            topbody = topbody + '<link rel="stylesheet" type="text/css" href="' + externalCss[a].linkurl + '">'
                        } else if (externalCss[a].linkposition == 'endbody' && externalCss[a].linkurl.trim().length > 0) {
                            endbody = endbody + '<link rel="stylesheet" type="text/css" href="' + externalCss[a].linkurl + '"> '
                        }

                    }
                }
                if (projectscripts != undefined && projectscripts.length > 0) {
                    for (let a = 0; a < projectscripts.length; a++) {
                        if (projectscripts[a].linkposition == 'starthead' && projectscripts[a].script.trim().length > 0) {
                            tophead = tophead + '<script type="text/javascript">' + projectscripts[a].script + '<\/script>'
                        } else if (projectscripts[a].linkposition == 'endhead' && projectscripts[a].script.trim().length > 0) {
                            endhead = endhead + '<script type="text/javascript">' + projectscripts[a].script + '<\/script>'
                        } else if (projectscripts[a].linkposition == 'startbody' && projectscripts[a].script.trim().length > 0) {
                            topbody = topbody + '<script type="text/javascript">' + projectscripts[a].script + '<\/script>'
                        } else if (projectscripts[a].linkposition == 'endbody' && projectscripts[a].script.trim().length > 0) {
                            endbody = endbody + '<script type="text/javascript">' + projectscripts[a].script + '<\/script>'
                        }
                    }
                }
                if (projectstyles != undefined && projectstyles.length > 0) {
                    for (let a = 0; a < projectstyles.length; a++) {
                        if (projectstyles[a].linkposition == 'starthead' && projectstyles[a].style.trim().length > 0) {
                            tophead = tophead + '<style type="text/css">' + projectstyles[a].style + '<\/style>'
                        } else if (projectstyles[a].linkposition == 'endhead' && projectstyles[a].style.trim().length > 0) {
                            endhead = endhead + '<style type="text/css">' + projectstyles[a].style + '<\/style>'
                        } else if (projectstyles[a].linkposition == 'startbody' && projectstyles[a].style.trim().length > 0) {
                            topbody = topbody + '<style type="text/css">' + projectstyles[a].style + '<\/style>'
                        } else if (projectstyles[a].linkposition == 'endbody' && projectstyles[a].style.trim().length > 0) {
                            endbody = endbody + '<style type="text/css">' + projectstyles[a].style + '<\/style>'
                        }
                    }
                }
                let partials = ''

                let rawSettings = responseConfig.configData;
                let nameF = rawSettings[1].pageSettings[i].PageName.split('.')[0]
                let Layout = ''
                let partialsPage = [];
                let vuepartials = [];
                let pagescripts = [];
                let pagestyles = [];
                let layoutdata = '';
                let pageexternalJs = [];
                let pageexternalCss = [];
                let pageMetaInfo = [];
                let PageMetacharset = '';
                logfile = logfile + '\n\t'+"["+d+"]:-"+'File name: ' + nameF +'.html'+ '\n'
                Layout = rawSettings[1].pageSettings[i].PageLayout
                partialsPage = rawSettings[1].pageSettings[i].partials
                let back_partials = (partialsPage);
                vuepartials = rawSettings[1].pageSettings[i].VueComponents
                pageexternalJs = rawSettings[1].pageSettings[i].PageExternalJs;
                pageexternalCss = rawSettings[1].pageSettings[i].PageExternalCss;
                pageMetaInfo = rawSettings[1].pageSettings[i].PageMetaInfo;
                pageSeoTitle = rawSettings[1].pageSettings[i].PageSEOTitle;
                PageMetacharset = rawSettings[1].pageSettings[i].PageMetacharset;
                pagescripts = rawSettings[1].pageSettings[i].PageScripts;
                pagestyles = rawSettings[1].pageSettings[i].PageStyles;
                PageCss = rawSettings[1].pageSettings[i].PageCss;

                if (pageSeoTitle != undefined && pageSeoTitle != '') {
                    SeoTitle = pageSeoTitle
                }
                if (PageMetacharset != undefined && PageMetacharset != '' && !(ProjectMetacharset != '')) {
                    tophead = tophead + '<meta charset="' + PageMetacharset + '">'
                }
                if (pageMetaInfo != undefined && pageMetaInfo.length > 0) {
                    for (let a = 0; a < pageMetaInfo.length; a++) {
                        if ((pageMetaInfo[a].name != '' && pageMetaInfo[a].name.trim().length > 0) && (pageMetaInfo[a].content != '' && pageMetaInfo[a].content.trim().length > 0)) {

                            tophead = tophead + '<meta name="' + pageMetaInfo[a].name + '" content="' + pageMetaInfo[a].content + '">'
                        }
                    }
                }
                if (pageexternalJs != undefined && pageexternalJs.length > 0) {
                    for (let a = 0; a < pageexternalJs.length; a++) {
                        if (pageexternalJs[a].linkposition == 'starthead' && pageexternalJs[a].linkurl.trim().length > 0) {
                            tophead = tophead + '<script src="' + pageexternalJs[a].linkurl + '"><\/script>'
                        } else if (pageexternalJs[a].linkposition == 'endhead' && pageexternalJs[a].linkurl.trim().length > 0) {
                            endhead = endhead + '<script src="' + pageexternalJs[a].linkurl + '"><\/script>'
                        } else if (pageexternalJs[a].linkposition == 'startbody' && pageexternalJs[a].linkurl.trim().length > 0) {
                            topbody = topbody + '<script src="' + pageexternalJs[a].linkurl + '"><\/script>'
                        } else if (pageexternalJs[a].linkposition == 'endbody' && pageexternalJs[a].linkurl.trim().length > 0) {
                            endbody = endbody + '<script src="' + pageexternalJs[a].linkurl + '"><\/script>'
                        }
                    }
                }

                if (pageexternalCss != undefined && pageexternalCss.length > 0) {
                    for (let a = 0; a < pageexternalCss.length; a++) {
                        if (pageexternalCss[a].linkposition == 'starthead' && pageexternalCss[a].linkurl.trim().length > 0) {
                            tophead = tophead + '<link rel="stylesheet" type="text/css" href="' + pageexternalCss[a].linkurl + '">'
                        } else if (pageexternalCss[a].linkposition == 'endhead' && pageexternalCss[a].linkurl.trim().length > 0) {
                            endhead = endhead + '<link rel="stylesheet" type="text/css" href="' + pageexternalCss[a].linkurl + '">'
                        } else if (pageexternalCss[a].linkposition == 'startbody' && pageexternalCss[a].linkurl.trim().length > 0) {
                            topbody = topbody + '<link rel="stylesheet" type="text/css" href="' + pageexternalCss[a].linkurl + '">'
                        } else if (pageexternalCss[a].linkposition == 'endbody' && pageexternalCss[a].linkurl.trim().length > 0) {
                            endbody = endbody + '<link rel="stylesheet" type="text/css" href="' + pageexternalCss[a].linkurl + '"> '
                        }
                    }
                }
                if (pagescripts != undefined && pagescripts.length > 0) {
                    for (let a = 0; a < pagescripts.length; a++) {
                        if (pagescripts[a].linkposition == 'starthead' && pagescripts[a].script.trim().length > 0) {
                            tophead = tophead + '<script type="text/javascript">' + pagescripts[a].script + '<\/script>'
                        } else if (pagescripts[a].linkposition == 'endhead' && pagescripts[a].script.trim().length > 0) {
                            endhead = endhead + '<script type="text/javascript">' + pagescripts[a].script + '<\/script>'
                        } else if (pagescripts[a].linkposition == 'startbody' && pagescripts[a].script.trim().length > 0) {
                            topbody = topbody + '<script type="text/javascript">' + pagescripts[a].script + '<\/script>'
                        } else if (pagescripts[a].linkposition == 'endbody' && pagescripts[a].script.trim().length > 0) {
                            endbody = endbody + '<script type="text/javascript">' + pagescripts[a].script + '<\/script>'
                        }
                    }
                }
                if (pagestyles != undefined && pagestyles.length > 0) {
                    for (let a = 0; a < pagestyles.length; a++) {
                        if (pagestyles[a].linkposition == 'starthead' && pagestyles[a].style.trim().length > 0) {
                            tophead = tophead + '<style type="text/css">' + pagestyles[a].style + '<\/style>'
                        } else if (pagestyles[a].linkposition == 'endhead' && pagestyles[a].style.trim().length > 0) {
                            endhead = endhead + '<style type="text/css">' + pagestyles[a].style + '<\/style>'
                        } else if (pagestyles[a].linkposition == 'startbody' && pagestyles[a].style.trim().length > 0) {
                            topbody = topbody + '<style type="text/css">' + pagestyles[a].style + '<\/style>'
                        } else if (pagestyles[a].linkposition == 'endbody' && pagestyles[a].style.trim().length > 0) {
                            endbody = endbody + '<style type="text/css">' + pagestyles[a].style + '<\/style>'
                        }
                    }
                }

                if (Layout == 'Blank') {
                    await axios.post(config.baseURL + '/save-menu', {
                            filename: folderUrl + '/Layout/Blank.layout',
                            text: '{{{ contents }}}',
                            type: 'file'
                        })
                        .catch((e) => {
                            //console.log("error while blank file creation")
                        })
                }
                // console.log('baseURL:',config.baseURL)
                layoutdata = await axios.get(config.baseURL + '/save-menu/0?path=' + folderUrl + '/Layout/' + Layout + '.layout').catch((err) => {
                    console.log(err);
                    // this.fullscreenLoading = false
                });
                let responseMetal = '';
                logfile = logfile + '\n\t'+"["+d+"]:-"+'Preparing Metalsmith Config file ...\n'
                let backupMetalSmith = '';

                let contentpartials = await axios.get(config.baseURL + '/save-menu/0?path=' + folderUrl + '/Pages/' + nameF + '.html').catch((err) => {
                    console.log(err);
                    // this.fullscreenLoading = false
                });
                contentpartials = contentpartials.data
                let backlayoutdata = (layoutdata);
                let newFolderName = folderUrl + '/temp';
                let destPath = websitePath + job.userId + '/' + job.websiteId + '/public';
                await axios.post(config.baseURL + '/save-menu', {
                        foldername: newFolderName,
                        type: 'folder'
                    }).then(async(res) => {

                        for (let p = 0; p < back_partials.length; p++) {
                            let responsepartials = await axios.get(config.baseURL + '/save-menu/0?path=' + folderUrl + '/Partials/' + Object.keys(back_partials[p]) + '/' + back_partials[p][Object.keys(back_partials[p])] + '.partial').catch((err) => {
                                console.log(err);
                                // this.fullscreenLoading = false
                            });
                            responsepartials = responsepartials.data
                            let result = (getFromBetween.get(responsepartials, "{{>", "}}"));
                            let DefaultParams = [];
                            if (result.length > 0) {
                                let resultParam = result
                                for (let q = 0; q < resultParam.length; q++) {
                                    let temp;
                                    temp = resultParam[q].trim()
                                    result[q] = result[q].trim()
                                    temp = temp.replace(/&nbsp;/g, ' ')
                                    temp = temp.replace(/\s+/g, ' ');
                                    temp = temp.trim();
                                    temp = temp.split(' ')
                                    for (let j = 0; j < temp.length; j++) {
                                        if ((temp[j].indexOf('id') != -1 || temp[j].indexOf('=') != -1)) {
                                            if (temp[j + 1] != undefined) {
                                                result[q] = temp[0];
                                                if (temp[j + 1].indexOf('.') > -1) {
                                                    let x = temp[j + 1]
                                                    x = temp[j + 1].split(/'/)[1];
                                                    let obj = {}
                                                    obj[temp[0]] = x
                                                    DefaultParams.push(obj)
                                                    break;
                                                }
                                            } else if ((temp[j].indexOf('.') > -1) && (temp[j + 1] == undefined)) {
                                                result[q] = temp[0];
                                                if (temp[j]) {
                                                    let x = temp[j]
                                                    x = temp[j].split(/'/)[1];
                                                    let obj = {}
                                                    obj[temp[0]] = x
                                                    DefaultParams.push(obj)
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                for (let j = 0; j < result.length; j++) {
                                    temp1 = '{{> ' + Object.keys(DefaultParams[j])[0] + " id='" + DefaultParams[j][Object.keys(DefaultParams[j])[0]] + "' }}"

                                    temp2 = '{{> ' + Object.keys(DefaultParams[j])[0] + '_' + DefaultParams[j][Object.keys(DefaultParams[j])[0]].split('.')[0] + " id='" + DefaultParams[j][Object.keys(DefaultParams[j])[0]] + "' }}"
                                    responsepartials = responsepartials.split(temp1).join(temp2)
                                }
                            }
                            await axios.post(config.baseURL + '/save-menu', {
                                filename: folderUrl + '/temp/' + Object.keys(back_partials[p]) + '_' + back_partials[p][Object.keys(back_partials[p])] + '.html',
                                text: responsepartials,
                                type: 'file'
                            }).catch((e) => {
                                console.log(e)
                            })
                        }
                        let result = (getFromBetween.get(layoutdata.data, "{{>", "}}"));
                        let changeresult = (result)
                        for (let s = 0; s < changeresult.length; s++) {
                            layoutdata.data = layoutdata.data.replace(changeresult[s], changeresult[s].replace(/&nbsp;/g, '').replace(/\"\s+\b/g, '"').replace(/\'\s+\b/g, "'").replace(/\b\s+\'/g, "'").replace(/\b\s+\"/g, '"').replace(/\s+/g, " ").replace(/\s*$/g, "").replace(/\s*=\s*/g, '='))
                        }
                        DefaultParams = [];
                        if (result.length > 0) {
                            let resultParam = result
                            for (let i = 0; i < resultParam.length; i++) {
                                let temp;
                                temp = resultParam[i].trim()
                                result[i] = result[i].trim()

                                temp = temp.split(' ')
                                for (let j = 0; j < temp.length; j++) {
                                    temp[j] = temp[j].trim();
                                    if ((temp[j].indexOf('id') != -1 || temp[j].indexOf('=') != -1)) {
                                        if ((temp[j].indexOf('=') > -1) && (temp[j + 1] == undefined) && temp[j].indexOf("'") > -1) {
                                            result[i] = temp[0];
                                            if (temp[j]) {
                                                let x = temp[j]
                                                x = temp[j].split("'")[1] + '.partial';
                                                let obj = {}
                                                obj[temp[0]] = x
                                                DefaultParams.push(obj)
                                                break;
                                            }
                                        }
                                        if ((temp[j].indexOf('=') > -1) && (temp[j + 1] == undefined) && temp[j].indexOf('"') > -1) {
                                            result[i] = temp[0];
                                            if (temp[j]) {
                                                let x = temp[j]
                                                x = temp[j].split('"')[1] + '.partial';
                                                let obj = {}
                                                obj[temp[0]] = x
                                                DefaultParams.push(obj)
                                                break;
                                            }
                                        } else {
                                            //console.log('Error while finding ID in layout');
                                        }
                                    }
                                }
                            }
                            for (let j = 0; j < result.length; j++) {
                                for (let i = 0; i < back_partials.length; i++) {
                                    if (Object.keys(back_partials[i])[0] == result[j]) {

                                        temp1 = '{{> ' + Object.keys(back_partials[i])[0] + '}}'
                                        if (layoutdata.data.search(temp1) > 0) {

                                            temp2 = '{{> ' + Object.keys(back_partials[i])[0] + '_' + back_partials[i][Object.keys(back_partials[i])[0]] + '}}'
                                        } else {
                                            let indexdefault = _.findIndex(DefaultParams, function(o) {
                                                return Object.keys(o)[0] == result[j]
                                            })
                                            temp1 = "{{> " + Object.keys(back_partials[i])[0] + " id='" + DefaultParams[indexdefault][Object.keys(back_partials[i])[0]].split('.')[0] + "'}}"

                                            temp2 = "{{> " + Object.keys(back_partials[i])[0] + '_' + back_partials[i][Object.keys(back_partials[i])[0]] + " id='" + DefaultParams[indexdefault][Object.keys(back_partials[i])[0]].split('.')[0] + "'}}"
                                        }
                                        if (layoutdata.data.split(temp1).join(temp2)) {
                                            layoutdata.data = layoutdata.data.split(temp1).join(temp2)
                                            break;
                                        } else {
                                            //console.log('Replacing in layout file failed')
                                        }
                                    }
                                }
                            }
                        }
                    })
                    .catch((e) => {
                        console.log(e)
                    logfile = logfile + '\n\t'+"["+d+"]:-"+'Error:'+e

                    })

                responseMetal = "var Metalsmith=require('" + config.metalpath + "metalsmith');\nvar markdown=require('" + config.metalpath + "metalsmith-markdown');\nvar layouts=require('" + config.metalpath + "metalsmith-layouts');\nvar permalinks=require('" + config.metalpath + "metalsmith-permalinks');\nvar inPlace = require('" + config.metalpath + "metalsmith-in-place')\nvar fs=require('" + config.metalpath + "file-system');\nvar Handlebars=require('" + config.metalpath + "handlebars');\n Metalsmith(__dirname)\n.metadata({\ntitle: \"Demo Title\",\ndescription: \"Some Description\",\ngenerator: \"Metalsmith\",\nurl: \"http://www.metalsmith.io/\"})\n.source('')\n.destination('" + destPath + "')\n.clean(false)\n.use(markdown())\n.use(inPlace(true))\n.use(layouts({engine:'handlebars',directory:'" + folderUrl + "/Layout'}))\n.build(function(err,files)\n{if(err){\nconsole.log(err)\n}});"

                backupMetalSmith = (responseMetal);

                let index = responseMetal.search('.source')

                responseMetal = responseMetal.substr(0, index + 9) + folderUrl + '/Preview' + responseMetal.substr(index + 9)
                let indexPartial = responseMetal.search("handlebars");

                let partialtemp = []
                for (let j = 0; j < partialsPage.length; j++) {
                    let temp1, temp2;
                    temp1 = '{{> ' + Object.keys(partialsPage[j])[0] + " id='" + partialsPage[j][Object.keys(partialsPage[j])[0]] + ".partial' }}"

                    temp2 = '{{> ' + Object.keys(partialsPage[j])[0] + '_' + partialsPage[j][Object.keys(partialsPage[j])[0]] + " id='" + partialsPage[j][Object.keys(partialsPage[j])[0]] + ".partial' }}"

                    //// console.log('temp1:',temp1)
                    //// console.log('temp2:',temp2)
                    if (contentpartials.match(temp1)) {
                        contentpartials = contentpartials.split(temp1).join(temp2)
                    }
                    let obj = {}
                    let key = Object.keys(partialsPage[j])[0] + '_' + partialsPage[j][Object.keys(partialsPage[j])[0]]
                        //// console.log('key:',key)
                        //// console.log('partialsPage:',partialsPage[j][Object.keys(partialsPage[j])[0]])
                    obj[key] = partialsPage[j][Object.keys(partialsPage[j])[0]]
                        // partialsPage[j] = []
                        // partialsPage[j] = obj
                    partialtemp[j] = obj;


                }
                for (let z = 0; z < partialtemp.length; z++) {
                    let key = Object.keys(partialtemp[z])[0];
                    let value = partialtemp[z]
                    let key2 = key;
                    key = key.trim();
                    if (value[key2].match('partial')) {
                        key = key.split('.')[0]
                        var temp = "Handlebars.registerPartial('" + key + "', fs.readFileSync('" + folderUrl + "/temp/" + Object.keys(back_partials[z])[0] + "_" + value[key2] + "').toString())\n"
                    } else {
                        var temp = "Handlebars.registerPartial('" + key + "', fs.readFileSync('" + folderUrl + "/temp/" + Object.keys(back_partials[z])[0] + "_" + value[key2] + ".html').toString())\n"
                    }
                    partials = partials + temp;
                }

                responseMetal = responseMetal.substr(0, indexPartial + 14) + partials + responseMetal.substr(indexPartial + 14);
                // console.log('final responseMetal:', responseMetal)
                logfile = logfile + '\n\t'+"["+d+"]:-"+'Done Preparing Metalsmith File. Now, Gathering required files ...\n'
                let mainMetal = folderUrl + '/public/assets/metalsmithPublish.js'
                let value = true;
                await axios.post(config.baseURL + '/save-menu', {
                        filename: mainMetal,
                        text: responseMetal,
                        type: 'file'
                    }).then(async(response) => {
                        let vueBodyStart = '';
                        let vueBodyEnd = ''
                        let newFolderName1 = folderUrl + '/Preview';
                        await axios.post(config.baseURL + '/save-menu', {
                                foldername: newFolderName1,
                                type: 'folder'
                            })
                            .then(async(res) => {
                                //console.log(res);
                                let datadivscript = ''
                                let divappstart = ''
                                let divappend = ''
                                let dfscript = ''
                                // if (contentpartials.indexOf('datafieldgroup') > 0) {
                                //     datadivscript = "<script type='text/javascript' src='https://cdn.jsdelivr.net/web-animations/latest/web-animations.min.js'><\/script>\n" +
                                //         "<script type='text/javascript' src='https://hammerjs.github.io/dist/hammer.min.js'><\/script>\n" +
                                //         "<script type='text/javascript' src='https://cdnjs.cloudflare.com/ajax/libs/muuri/0.5.3/muuri.min.js'><\/script>\n" +
                                //         "<script type='text/javascript' src='https://unpkg.com/vue/dist/vue.js'><\/script>\n"
                                //     divappstart = '<div id="app">'
                                //     divappend = '</div>'
                                // }

                                if (PageCss == 'VueSearchJS') {
                                divappstart   = '<div id="app">'
                                divappend     = '</div>'
                                dfscript      = "<script type='text/javascript' src='https://unpkg.com/vue/dist/vue.js'><\/script>\n" 
                                                + "<link rel='stylesheet' type='text/css' href='https://res.cloudinary.com/flowz/raw/upload/v1526901609/component-base.css'>\n"
                                                + '<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.5/lodash.min.js"><\/script>\n'
                                                + '<script src="https://unpkg.com/vuejs-paginate@1.9.0/dist/index.js"><\/script>\n'
                                                + '<link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">'
                                                + '<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"><\/script>'
                                                + '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery.lazy/1.7.8/jquery.lazy.min.js"><\/script>\n'
                                                + '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery.lazy/1.7.8/jquery.lazy.plugins.min.js"><\/script>\n'
                                                + '<script src="https://cdn.jsdelivr.net/npm/js-cookie@2/src/js.cookie.min.js"><\/script>\n'
                                                + '<script src="./../assets/client-plugins/vuelastic.js"><\/script>'
                              }

                              if (PageCss == 'VueDataJS') {
                                divappstart   = '<div id="app">'
                                divappend     = '</div>'
                                dfscript      = "<script type='text/javascript' src='https://unpkg.com/vue/dist/vue.js'><\/script>\n" 
                                                + "<script type='text/javascript' src='https://cdn.jsdelivr.net/web-animations/latest/web-animations.min.js'><\/script>\n"
                                                + "<script type='text/javascript' src='https://hammerjs.github.io/dist/hammer.min.js'><\/script>\n"
                                                + "<script type='text/javascript' src='https://cdnjs.cloudflare.com/ajax/libs/muuri/0.5.3/muuri.min.js'><\/script>\n"
                                                + "<link rel='stylesheet' type='text/css' href='https://res.cloudinary.com/flowz/raw/upload/v1526901609/component-base.css'>\n"
                                                + "<script type='text/javascript' src='https://unpkg.com/vue/dist/vue.js'><\/script>"
                                                + '<script src="https://unpkg.com/iview/dist/iview.min.js"><\/script>'
                                                + '<link rel="stylesheet" href="https://unpkg.com/iview/dist/styles/iview.css">'
                                                + "<script type='text/javascript' src='https://res.cloudinary.com/flowz/raw/upload/v1533551691/builder/js/vuecomponent.js'><\/script>"
                              }

                                let newContent = "<html>\n<head>\n" + tophead +
                                    "<title>" + SeoTitle + "</title>\n" + favicon + '\n' +
                                    '<script src="https://code.jquery.com/jquery-3.3.1.min.js"><\/script>\n' +
                                    "<link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/themes/base/theme.min.css' />\n" +
                                    '<link href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">\n' +
                                    "<link rel='stylesheet' href='./main-files/main.css'/>\n" +
                                    endhead + "\n</head>\n<body>\n" + divappstart +
                                    topbody + layoutdata.data +
                                    '\n' + divappend +
                                    "<script src='https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.3/socket.io.js'><\/script>\n" +
                                    "<script src='https://cdn.jsdelivr.net/npm/feathers-client@1.1.0/dist/feathers.js'><\/script>\n" +
                                    "<script src='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js' crossorigin='anonymous'><\/script>\n" +
                                    '<script src="./assets/client-plugins/flowz-builder-engine.js"><\/script>\n' +
                                    '<script src="https://cdnjs.cloudflare.com/ajax/libs/axios/0.17.1/axios.js"><\/script>\n' +
                                    // '\n<script src="./assets/client-plugins/global-variables-plugin.js"><\/script>\n' +
                                    endbody + dfscript +
                                    '\n</body>\n</html>';

                                // console.log('folderUrl:',folderUrl)
                                await axios.post(config.baseURL + '/save-menu', {
                                    filename: folderUrl + '/Layout/' + Layout + '_temp.layout',
                                    text: newContent,
                                    type: 'file'
                                }).catch((e) => {
                                    console.log(e)
                                });

                                let rawContent = '<div id="flowz_content">' + contentpartials + '</div>';;

                                if (Layout == 'Blank') {

                                    rawContent = '---\nlayout: ' + Layout + '_temp.layout\n---\n' + rawContent

                                } else {
                                    let tempValueLayout = '---\nlayout: ' + Layout + '_temp.layout\n---\n';
                                    rawContent = tempValueLayout + rawContent
                                }

                                let previewFileName = folderUrl + '/Preview/' + nameF + '.hbs';

                                await axios.post(config.baseURL + '/save-menu', {
                                        filename: previewFileName,
                                        text: rawContent,
                                        type: 'file'
                                    })
                                    .then(async(res) => {
                                        // this.saveFileLoading = false;

                                        await axios.get(config.baseURL + '/metalsmith-publish?path=' + folderUrl, {}).then(async(response) => {
                                                
                                                await axios.post(config.baseURL + '/save-menu', {
                                                        filename: mainMetal,
                                                        text: backupMetalSmith,
                                                        type: 'file'
                                                    })
                                                    .then(async(res) => {
                                                        logfile = logfile + '\n\t'+"["+d+"]:-"+'Successfully file published.'
                                                            // var previewFile = this.$store.state.fileUrl.replace(/\\/g, "\/");
                                                            // previewFile = folderUrl.replace('/var/www/html', '');
                                                        let finalouputpage=await axios.get(config.baseURL + '/save-menu/0?path=' + websitePath + job.userId + '/' + job.websiteId + '/public/'+nameF+'.html',{}).catch((e)=>{console.log(e)})
                                                        // console.log('nameF:',nameF)
                                                        if(job.websitejobqueuedata.RepojsonData.gitlabconfig!=undefined){
                                                            let tempjson=''
                                                            // let gitlabfileresponse=await axios.get('https://gitlab.com/api/v4/projects/'+job.websitejobqueuedata.RepojsonData.gitlabconfig.projectid+'/repository/files/'+nameF+'.html?ref=master')
                                                            // .catch((e)=>{})
                                                            // // console.log('gitlabfileresponse',gitlabfileresponse)
                                                            // if(gitlabfileresponse!=undefined && gitlabfileresponse.data){
                                                            // // console.log('found')
                                                            // tempjson='{"action": "update","encoding":"base64","file_path": "'+nameF+'.html","content": "'+Base64.btoa(finalouputpage.data)+'" }'  
                                                            // }else{
                                                            //  // console.log('not found ')
                                                            //  tempjson='{"action": "create","encoding":"base64","file_path": "'+nameF+'.html","content": "'+Base64.btoa(finalouputpage.data)+'" }'  
                                                            // }
                                                            // console.log('nameF:',nameF)
                                                            let fileindex=_.findIndex(arrayofrepopages,function(o){
                                                              return o.name==nameF+'.html'
                                                            })
                                                            // console.log('fileindex:',fileindex)
                                                            if(fileindex!=-1){
                                                                 tempjson='{"action": "update","encoding":"base64","file_path": "'+nameF+'.html","content": "'+Base64.btoa(unescape(encodeURIComponent(finalouputpage.data)))+'" }'  
                                                            }else{
                                                                tempjson='{"action": "create","encoding":"base64","file_path": "'+nameF+'.html","content": "'+Base64.btoa(unescape(encodeURIComponent(finalouputpage.data)))+'" }'  
                                                            }
                                                            arrayofpages.push(tempjson)  

                                                        }
                                                        
                                                        await axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Preview')
                                                            .then(async(res) => {
                                                                await axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/temp').catch((e) => {
                                                                    console.log(e)
                                                                })
                                                                await axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Layout/' + Layout + '_temp.layout').then((res) => {
                                                                    //// console.log('deleted extra layout file:', res)
                                                                }).catch((e) => {
                                                                    console.log(e)
                                                                })
                                                                if (vuepartials != undefined && vuepartials.length > 0) {
                                                                    for (let x = 0; x < vuepartials.length; x++) {

                                                                        await axios.delete(config.baseURL + '/save-menu/0?filename=' + config.pluginsPath + '/public/' + vuepartials[x].value.split('.')[0] + '.js').then((res) => {
                                                                                //console.log(res)
                                                                            })
                                                                            .catch((e) => {
                                                                                console.log(e)
                                                                            })
                                                                    }
                                                                }
                                                                //console.log("layout file reset")
                                                                if (Layout == 'Blank') {
                                                                    await axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Layout/Blank.layout')
                                                                        .catch((e) => {
                                                                            console.log(e)
                                                                                //console.log("error while deleting blank.layout file")
                                                                        })
                                                                }

                                                                // })

                                                            })
                                                            .catch((e) => {
                                                                console.log(e)
                                                            })
                                                    }).catch((e) => {
                                                        console.log(e)
                                                    });
                                                    
                                            })
                                            .catch((err) => {
                                                // this.saveFileLoading = false;
                                                // this.fullscreenLoading = false;
                                                //console.log('error while creating metalsmithJSON file' + err)
                                                axios.post(config.baseURL + '/save-menu', {
                                                    filename: mainMetal,
                                                    text: backupMetalSmith,
                                                    type: 'file'
                                                }).catch((e) => {
                                                    console.log(e)
                                                });
                                                axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/temp').catch((e) => {
                                                    console.log(e)
                                                })
                                                axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Preview').catch((e) => {
                                                    console.log(e)
                                                });
                                                console.log(err)
                                                axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Layout/' + Layout + '_temp.layout').catch((e) => {
                                                    console.log(e)
                                                });
                                            })
                                    })
                                    .catch((e) => {
                                        // this.saveFileLoading = false
                                        // this.fullscreenLoading = false;
                                        axios.post(config.baseURL + '/save-menu', {
                                            filename: mainMetal,
                                            text: backupMetalSmith,
                                            type: 'file'
                                        }).catch((e) => {
                                            console.log(e)
                                        });
                                        axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Layout/' + Layout + '_temp.layout').catch((e) => {
                                            console.log(e)
                                        });
                                        axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/temp').catch((e) => {
                                            //console.log(e)
                                        })
                                        axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Preview').catch((e) => {
                                            console.log(e)
                                        });
                                        console.log(e)
                                    })

                            })
                            .catch((e) => {
                                // this.saveFileLoading = false;
                                // this.fullscreenLoading = false;
                                console.log(e)
                                axios.post(config.baseURL + '/save-menu', {
                                    filename: mainMetal,
                                    text: backupMetalSmith,
                                    type: 'file'
                                }).catch((e) => {
                                    console.log(e)
                                });
                                axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Layout/' + Layout + '_temp.layout').catch((e) => {
                                    console.log(e)
                                });
                                axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/temp').catch((e) => {
                                    //console.log(e)
                                })
                                axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Preview').catch((e) => {
                                    console.log(e)
                                });
                            })

                    })
                    .catch((e) => {
                        // this.saveFileLoading = false;
                        // this.fullscreenLoading = false;
                        console.log(e)
                        axios.post(config.baseURL + '/save-menu', {
                            filename: mainMetal,
                            text: backupMetalSmith,
                            type: 'file'
                        }).catch((e) => {
                            console.log(e)
                        });
                        axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/Layout/' + Layout + '_temp.layout').catch((e) => {
                            console.log(e)
                        });
                        axios.delete(config.baseURL + '/save-menu/0?filename=' + folderUrl + '/temp').catch((e) => {
                            //console.log(e)
                        })

                    })
            }
            await axios.get(config.baseURL + '/delete-publish-files?path=' + job.websitejobqueuedata.RepojsonData.configData[0].repoSettings[0].BaseURL)
                .catch((e) => {
                    console.log(e)
                })
            if (checkcancel != false) {
                logfile = logfile + '\n\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n\n\t\t\tAll Pages Published.'
                    // console.log('####################################',rawConfigs[0].repoSettings[0].BaseURL + '/public/log.md')
                await axios.post(config.baseURL + '/save-menu', {
                    filename: rawConfigs[0].repoSettings[0].BaseURL + '/public/log.md',
                    text: '# Welcome to Log File!\n' + logfile,
                    type: 'file'
                }).catch((e) => {
                    console.log(e)
                })
                // committing this into gitlab deployment repo. 
                if(job.websitejobqueuedata.RepojsonData.gitlabconfig!=undefined){
                  let buildpayload='{ "branch": "master","commit_message": "publishing", "actions": ['+arrayofpages+'] }'
                // console.log('buildpayload::::::::::::::::::::::::::::::::::::::::::::::::',buildpayload)
                let axiosoptioncommit={
                    method:'post',
                    url:'https://gitlab.com/api/v4/projects/'+job.websitejobqueuedata.RepojsonData.gitlabconfig.projectid+'/repository/commits',
                    data:buildpayload,
                    headers:{ 'PRIVATE-TOKEN':gitlabtoken, 'Content-Type':'application/json'}
                  }
                  await axios(axiosoptioncommit)
                  .then(async (res)=>{
                    console.log('Commit Done in gitlab. Netlify triggered')
                    await axios.post(job.websitejobqueuedata.RepojsonData.gitlabconfig.webhook_url,{}).then((res)=>{console.log('webhook called')})
                  })
                  .catch((e)=>{console.log(e)})  
                }
                 
                // console.log('buildpayload',buildpayload)
                await axios.patch(config.baseURL + '/jobqueue', {
                    'Status': 'completed',
                    'websiteName': websitename,
                    'websiteid': websiteid,
                    'userId':userId
                }).then((res)=>{

                    console.log('job completed')
                })
                .catch((e) => {
                    console.log(e)
                })

            }
            else{
                // console.log('Job cancelled: ' + jobId)
                    checkcancel=true
                    await axios.patch(config.baseURL + '/jobqueue', {
                        'Status': 'cancelled',
                        'websiteName': websitename,
                        'websiteid': websiteid,
                        'userId':userId
                    }).catch((e) => {
                        console.log(e)
                    })
            }
            return next()
        } catch (err) {
            console.error(err)
            return next(err)
        }

    })
    // q.on('completed', async(queueId, jobId, isRepeating) => {
    //     // console.log('Processing Queue: ' + queueId)

    //     if (!iscancelled) {
    //         console.log('Job completed: ' + jobId)
    //         await axios.patch(config.baseURL + '/jobqueue', {
    //             'Status': 'completed',
    //             'websiteName': websitename,
    //             'websiteid': websiteid,
    //             'userId':userId
    //         }).catch((e) => {
    //             console.log(e)
    //         })
    //     }

    //     // console.log('Is job repeating: ' + isRepeating)

    // })
    q.on('error', (err) => {
        console.log('Queue Id: ' + err.queueId)
        console.error(err)
    })
    q.on('failed', async(queueId, jobId) => {
        console.log('Job failed: ' + jobId)
        await axios.patch(config.baseURL + '/jobqueue', {
            'Status': 'failed',
            'websiteName': websitename,
            'websiteid': websiteid,
            'userId':userId
        }).catch((e) => {
            console.log(e)
        })
    })

    // q.on('progress', async(queueId, jobId, percent) => {

    //     // console.log('Job progress: ' + percent)

    //     if (!iscancelled) {
    //         await axios.patch(config.baseURL + '/jobqueue', {
    //             'Status': 'progress',
    //             'Percentage': percent,
    //             'websiteName': websitename,
    //             'websiteid': websiteid,
    //             'userId':userId
    //         }).catch((e) => {
    //             console.log(e)
    //         })
    //     }
    // })
    q.on('cancelled', async(queueId, jobId) => {
        console.log('Job cancelled: ' + jobId)
        // await axios.patch(config.baseURL + '/jobqueue', {
        //     'Status': 'cancelled',
        //     'websiteName': websitename,
        //     'websiteid': websiteid,
        //     'userId':userId
        // }).catch((e) => {
        //     console.log(e)
        // })
    })
}

getJobs()