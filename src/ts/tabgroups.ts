import { moveTab } from "./tabs";
import { Tab, TabGroup, TabWindow } from "./types";

type TabGroupDescriptor = {
  window: TabWindow
  group: TabGroup
}

const groupIDs: { [gid: number]: TabGroupDescriptor } = {};
let groupIDsAmount = 0;

export function createTabGroup(win: TabWindow, group: TabGroup) {
  if (
    group.startIndex < 0 || group.endIndex < 0 ||
    group.startIndex >= win.tabs.length || group.endIndex >= win.tabs.length + 1 ||
    group.startIndex >= group.endIndex
  ) {
    throw new Error("Tab group could not be created - the tab indexes are incorrect");
  }
  win.tabGroups.push(group)
  if (group.id == undefined) {
    group.id = groupIDsAmount;
    groupIDsAmount++;
  }
  groupIDs[group.id] = { window: win, group };
  win.chrome.webContents.send('addTabGroup', group)
}

export function addTabToGroup(win: TabWindow, group: TabGroup, tab: Tab) {
  const index = win.tabs.indexOf(tab);
  if (index == -1) throw new Error("Tab is not in the window");

  if (getTabGroupByTab(tab)) return;

  console.log('adding tab to group', group, index);

  if (index == group.endIndex) {
    group.endIndex++;

  } else if (group.startIndex - index == 1) {
    group.startIndex--;

  } else {
    moveTab(tab, { window: win, index: group.endIndex });
    group.endIndex++;
  }
  win.chrome.webContents.send('tabGroupUpdate', group)
}

export function removeTabFromGroup(win: TabWindow, group: TabGroup, tab: Tab) {
  const index = win.tabs.indexOf(tab);
  if (index == -1) throw new Error("Tab is not in the window");

  if (getTabGroupByTab(tab) != group) throw new Error("Tab is not in the group");

  if (group.endIndex - index == 1) {
    group.endIndex--;

  } else if (group.startIndex == index) {
    group.startIndex++;

  } else {
    moveTab(tab, { window: win, index: group.endIndex - 1 });
  }
  win.chrome.webContents.send('tabGroupUpdate', group)

  destroyEmptyGroups(win);
}

export function getTabsFromTabGroup(win: TabWindow, group: TabGroup) {
  return win.tabs.slice(group.startIndex, group.endIndex);
}

export function getTabGroupByID(gid: number) {
  if (!(gid in groupIDs)) throw new Error("The tab group was destroyed.");

  return groupIDs[gid];
}

export function ungroup(win: TabWindow, group: TabGroup) {
  const groupIndex = win.tabGroups.indexOf(group);
  if (groupIndex == -1) throw new Error("Group not in window");

  win.tabGroups.splice(groupIndex, 1);
  win.chrome.webContents.send('removeTabGroup', group.id);

  delete groupIDs[group.id];
}

export function getTabGroupByTab(tab: Tab): TabGroup | void {
  if (!tab.owner) throw new Error("Getting tab group by tab failed: tab doesn't have an owner");

  const index = tab.owner.tabs.indexOf(tab);
  if (index == -1) throw new Error("Getting tab group by tab failed: tab not in window");

  for (const group of tab.owner.tabGroups) {
    if (index < group.endIndex && index >= group.startIndex) {
      return group;
    }
  }
  return null;
}

export function destroyEmptyGroups(win: TabWindow) {
  const emptyGroups = win.tabGroups.filter(group => group.startIndex >= group.endIndex);
  emptyGroups.forEach(g => ungroup(win, g))
}