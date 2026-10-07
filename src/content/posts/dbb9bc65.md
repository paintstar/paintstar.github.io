---
title: "算法训练 Acwing 5937 - 汉诺塔问题"
description: "从经典汉诺塔问题出发，梳理递归的拆解方式、终止条件与移动次数。"
date: "2025-12-25T06:06:06.000Z"
updated: "2025-12-28T05:32:28.419Z"
tags: ["Acwing","Algorithm","递归"]
category: "Algorithm-ICPC Dream"
topic: "算法"
---

## 题目链接

[https://www.acwing.com/problem/content/description/5937/](https://www.acwing.com/problem/content/description/5937/)

## 题目描述

约 19 世纪末，在欧州的商店中出售一种智力玩具，在一块铜板上有三根杆，最左边的杆上自上而下、由小到大顺序串着由 64 个圆盘构成的塔。

目的是将最左边杆上的盘全部移到中间的杆上，条件是一次只能移动一个盘，且不允许大盘放在小盘的上面。

这是一个著名的问题，几乎所有的教材上都有这个问题。

由于条件是一次只能移动一个盘，且不允许大盘放在小盘上面，所以 64 个盘的移动次数是：18,446,744,073,709,551,615

这是一个天文数字，若每一微秒可能计算(并不输出)一次移动，那么也需要几乎一百万年。

我们仅能找出问题的解决方法并解决较小 N 值时的汉诺塔，但很难用计算机解决 64 层的汉诺塔。

假定圆盘从小到大编号为 1,2,…

### 输入格式

输入为一个整数后面跟三个单字符字符串。

整数为盘子的数目，后三个字符表示三个杆子的编号。

### 输出格式

输出每一步移动盘子的记录。一次移动一行。

每次移动的记录为例如 `a->3->b` 的形式，即把编号为 3 的盘子从 a 杆移至 b 杆。

### 数据范围

盘子的数目范围 \[1,20\]。

### 输入样例：

```text
2 a b c
```

### 输出样例：

```text
a->1->c
a->2->b
c->1->b
```

## 分析及AC代码

很经典的问题，但是每一次写都会惊叹于算法的魅力。

我们可以发现 对于想将 n 个盘子 从 ori 借助 tmp 移动到 target，实际上我们需要将 n - 1个盘子 先从 ori 借助 target 移动到 tmp，然后再将 第 n 个盘子 从 ori 移动到 target， 最后将 n - 1个盘子 从 tmp 借助 ori 移动到 target。

即把原本的问题拆成了 3 步 操作，并且其中 移动 n - 1 个盘子的操作 与原有问题完全一样，又可以拆分成 3 个操作。

由此想到递归进行处理。注意处理递归终点 n 为 1 的时候。

个人感觉明白透彻的点在于我们可以先假定 一个函数可以实现一个功能，不管实际实现，先假定就是可以实现这个功能，例如本题就在于我们将 hanoi 函数定义为，他就是可以 将 n 个盘子 从 ori 借助 tmp 移动到 target。

AC代码：

```cpp
#include<bits/stdc++.h>
using namespace std;
int n;
char a, b, c;

void hanoi(int n, char ori, char goal, char tmp){
    if(n == 1){
        printf("%c->%d->%c\n", ori, n, goal);
        return;
    }
    hanoi(n-1, ori, tmp, goal);
    printf("%c->%d->%c\n", ori, n, goal);
    hanoi(n-1, tmp, goal, ori);
}

int main(){
    cin>>n>>a>>b>>c;
    hanoi(n, a, b, c);
}
```
