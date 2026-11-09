import assert from "node:assert/strict";
import test from "node:test";
import {choosePhotoView,photoHref,galleryPosition,horizontalSwipe} from "./photo-navigation.ts";

const photo={albumId:"a",placeId:"p",milestoneId:"m"};
test("open a photo in the chosen collection only when it belongs there",()=>{
  assert.deepEqual(choosePhotoView("place","p",photo),{kind:"place",id:"p"});
  assert.deepEqual(choosePhotoView("milestone","m",photo),{kind:"milestone",id:"m"});
  assert.deepEqual(choosePhotoView("place","other",photo),{kind:"album",id:"a"});
  assert.deepEqual(choosePhotoView("milestone","other",photo),{kind:"album",id:"a"});
  assert.deepEqual(choosePhotoView(undefined,undefined,photo),{kind:"album",id:"a"});
});
test("photo links preserve the active album/place/milestone",()=>{
  assert.equal(photoHref("one",{kind:"album",id:"a"}),"/anh/one");
  assert.equal(photoHref("one",{kind:"place",id:"p"}),"/anh/one?view=place&group=p");
  assert.equal(photoHref("one",{kind:"milestone",id:"m"}),"/anh/one?view=milestone&group=m");
});
test("gallery does not wrap at the first or last photo",()=>{
  const ids=["one","two","three"];
  assert.deepEqual(galleryPosition(ids,"one"),{position:1,total:3,previousId:null,nextId:"two"});
  assert.deepEqual(galleryPosition(ids,"two"),{position:2,total:3,previousId:"one",nextId:"three"});
  assert.deepEqual(galleryPosition(ids,"three"),{position:3,total:3,previousId:"two",nextId:null});
  assert.deepEqual(galleryPosition(ids,"not-found"),{position:0,total:3,previousId:null,nextId:null});
});
test("only an intentional horizontal gesture changes photos",()=>{
  assert.equal(horizontalSwipe({x:200,y:80},{x:70,y:86}),"next");
  assert.equal(horizontalSwipe({x:40,y:80},{x:120,y:82}),"previous");
  assert.equal(horizontalSwipe({x:40,y:80},{x:72,y:81}),null);
  assert.equal(horizontalSwipe({x:40,y:80},{x:150,y:220}),null);
});
