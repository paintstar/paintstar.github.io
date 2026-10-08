---
title: "算法训练 leetcode 665. 非递减序列"
description: "只修改一个元素，能否让整个序列变得非递减？从相邻元素的关系寻找判断条件。"
date: "2025-12-25T06:16:47.000Z"
updated: "2025-12-28T05:32:33.528Z"
topic: "算法题目"
categories: ["leetcode"]
tags: ["leetcode","贪心","算法题"]
---

## 题目链接

[https://leetcode.cn/problems/non-decreasing-array/description/](https://leetcode.cn/problems/non-decreasing-array/description/)

## 题目描述

给你一个长度为 `n` 的整数数组 `nums` ，请你判断在 **最多** 改变 `1` 个元素的情况下，该数组能否变成一个非递减数列。

我们是这样定义一个非递减数列的： 对于数组中任意的 `i` `(0 <= i <= n-2)`，总满足 `nums[i] <= nums[i + 1]`。

**示例 1:**

```text
输入: nums = [4,2,3]
输出: true
解释: 你可以通过把第一个 4 变成 1 来使得它成为一个非递减数列。
```

**示例 2:**

```text
输入: nums = [4,2,1]
输出: false
解释: 你不能在只改变一个元素的情况下将其变为非递减数列。
```

**提示：**

-   `n == nums.length`
-   `1 <= n <= 104`
-   `-105 <= nums[i] <= 105`

## 分析及AC代码

简单的分类讨论，遇到 右值 小于当前值则 需要进行判断，根据左值 和 右值大小对比，容易得到最佳处理结果。

```cpp
class Solution {
public:
    bool checkPossibility(vector<int>& nums) {
        int l = -100000-1;
        int n = nums.size();
        bool ff = 1;
        bool has_ans = 1;
        for(int i=0;i<n-1;i++){
           if(nums[i] > nums[i+1]){
            if(!ff){
                has_ans = 0;
                break;
            }else{
                ff = 0;
                if(l <= nums[i + 1]){
                    nums[i] = nums[i+1];
                }else{
                    nums[i+1]  = nums[i];
                }
            }
           }
            l = nums[i];
        }
        return has_ans;
    }
};
```
